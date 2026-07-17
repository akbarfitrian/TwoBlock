CREATE TABLE verification_pricing (
    tier               verification_tier PRIMARY KEY,
    monthly_price_usdc NUMERIC(18, 6) NOT NULL,
    annual_discount    NUMERIC(4, 3) NOT NULL DEFAULT 0.15,
    daily_post_limit   INT,
    max_post_chars     INT NOT NULL,
    can_attach_image   BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_post      BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO verification_pricing (tier, monthly_price_usdc, annual_discount, daily_post_limit, max_post_chars, can_attach_image, can_edit_post)
VALUES
    ('free',         0,  0.15, 1, 60,  FALSE, FALSE),
    ('verified',     5,  0.15, 2, 150, FALSE, FALSE),
    ('verified_pro', 12, 0.15, 2, 250, TRUE,  FALSE),
    ('verified_max', 20, 0.15, 3, 350, TRUE,  TRUE);

CREATE OR REPLACE FUNCTION annual_price_usdc(p_tier verification_tier)
RETURNS NUMERIC(18, 6) AS $$
    SELECT ROUND(monthly_price_usdc * 12 * (1 - annual_discount), 6)
    FROM verification_pricing WHERE tier = p_tier;
$$ LANGUAGE sql STABLE;

CREATE TABLE verification_purchases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address),
    tier           verification_tier NOT NULL,
    billing        TEXT NOT NULL CHECK (billing IN ('monthly', 'yearly')),
    amount_usdc    NUMERIC(18, 6) NOT NULL,
    tx_ref         TEXT NOT NULL UNIQUE,
    tx_status      TEXT NOT NULL DEFAULT 'pending' CHECK (tx_status IN ('pending', 'confirmed', 'failed')),
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_purchases_wallet ON verification_purchases (wallet_address, created_at DESC);

ALTER TABLE verification_pricing    ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_purchases  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_pricing_public_read" ON verification_pricing
    FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION purchase_verification(
    p_wallet_address TEXT,
    p_tier           verification_tier,
    p_billing        TEXT,
    p_amount_usdc    NUMERIC(18, 6),
    p_tx_ref         TEXT
) RETURNS verification_purchases AS $$
DECLARE
    v_expected_price NUMERIC(18, 6);
    v_expires_at     TIMESTAMPTZ;
    v_current_expiry TIMESTAMPTZ;
    v_purchase       verification_purchases;
BEGIN
    IF p_tier = 'free' THEN
        RAISE EXCEPTION 'Tier free tidak bisa dibeli';
    END IF;
    IF p_billing NOT IN ('monthly', 'yearly') THEN
        RAISE EXCEPTION 'Billing % tidak valid', p_billing;
    END IF;

    SELECT CASE WHEN p_billing = 'yearly' THEN annual_price_usdc(p_tier) ELSE monthly_price_usdc END
        INTO v_expected_price
        FROM verification_pricing WHERE tier = p_tier;

    IF v_expected_price IS NULL THEN
        RAISE EXCEPTION 'Tier % tidak ditemukan di verification_pricing', p_tier;
    END IF;
    IF p_amount_usdc <> v_expected_price THEN
        RAISE EXCEPTION 'Jumlah pembayaran (%) tidak sesuai harga % (%) untuk tier %',
            p_amount_usdc, p_billing, v_expected_price, p_tier;
    END IF;

    SELECT verification_expires_at INTO v_current_expiry
        FROM profiles
        WHERE wallet_address = p_wallet_address
          AND verification_tier = p_tier
          AND verification_expires_at > now();

    v_expires_at := COALESCE(v_current_expiry, now())
        + (CASE WHEN p_billing = 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END);

    UPDATE profiles
        SET verification_tier = p_tier,
            verification_expires_at = v_expires_at,
            updated_at = now()
        WHERE wallet_address = p_wallet_address;

    INSERT INTO verification_purchases (wallet_address, tier, billing, amount_usdc, tx_ref, expires_at)
        VALUES (p_wallet_address, p_tier, p_billing, p_amount_usdc, p_tx_ref, v_expires_at)
        ON CONFLICT (tx_ref) DO NOTHING
        RETURNING * INTO v_purchase;

    IF v_purchase IS NULL THEN
        SELECT * INTO v_purchase FROM verification_purchases WHERE tx_ref = p_tx_ref;
    END IF;

    RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
