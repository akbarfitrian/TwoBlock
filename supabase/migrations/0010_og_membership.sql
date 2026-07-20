-- Full migration off the old 4-tier expiring "verification" model onto a
-- single lifetime "OG" membership ($28, one-time, no billing period).

-- 1. profiles: verification_tier / verification_expires_at -> is_og / og_member_since_block
ALTER TABLE profiles ADD COLUMN is_og BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN og_member_since_block INT;

-- Any wallet that had a still-active paid tier on the old model does NOT
-- carry over automatically — per product decision, all pre-existing
-- verified/verified_pro/verified_max testnet data is reset to free. OG
-- membership can only be (re)established through a real purchaseOG() tx,
-- which is what sets is_og + og_member_since_block from here on.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS expiry_required_if_paid;
ALTER TABLE profiles DROP COLUMN verification_tier;
ALTER TABLE profiles DROP COLUMN verification_expires_at;

DROP INDEX IF EXISTS idx_profiles_tier;
CREATE INDEX idx_profiles_is_og ON profiles (is_og) WHERE is_og = TRUE;

-- 2. posts: gated-post flag
ALTER TABLE posts ADD COLUMN is_gated BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. drop the old tier enum + its helper now that nothing references it
DROP FUNCTION IF EXISTS max_images_for_tier(verification_tier);
DROP FUNCTION IF EXISTS enforce_image_limit() CASCADE;

CREATE OR REPLACE FUNCTION max_images_for_og(og BOOLEAN)
RETURNS INT AS $$
  SELECT CASE WHEN og THEN 8 ELSE 1 END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION enforce_image_limit() RETURNS TRIGGER AS $$
DECLARE
    author_is_og BOOLEAN;
BEGIN
    SELECT is_og INTO author_is_og FROM profiles WHERE wallet_address = NEW.author_wallet;
    IF array_length(NEW.image_urls, 1) > max_images_for_og(author_is_og) THEN
        RAISE EXCEPTION 'Image count (%) exceeds the OG=% limit (max %)',
            array_length(NEW.image_urls, 1), author_is_og, max_images_for_og(author_is_og);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_image_limit
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION enforce_image_limit();

-- 4. verification_pricing / verification_purchases -> og_pricing (1 row) / og_purchases
-- (must drop these — and the functions that reference verification_tier —
-- BEFORE dropping the type itself, or Postgres refuses with "cannot drop
-- type because other objects depend on it")
DROP FUNCTION IF EXISTS purchase_verification(TEXT, verification_tier, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS annual_price_usdc(verification_tier);
DROP TABLE IF EXISTS verification_purchases;
DROP TABLE IF EXISTS verification_pricing;

DROP TYPE IF EXISTS verification_tier;

CREATE TABLE og_pricing (
    id                 BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    price_usdc         NUMERIC(18, 6) NOT NULL,
    daily_post_limit   INT NOT NULL,
    max_post_chars     INT NOT NULL,
    can_attach_image   BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_post      BOOLEAN NOT NULL DEFAULT TRUE,
    can_create_poll    BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO og_pricing (price_usdc, daily_post_limit, max_post_chars, can_attach_image, can_edit_post, can_create_poll)
VALUES (28, 3, 350, TRUE, TRUE, TRUE);

CREATE TABLE og_purchases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address),
    amount_usdc    NUMERIC(18, 6) NOT NULL,
    tx_ref         TEXT NOT NULL UNIQUE,
    tx_status      TEXT NOT NULL DEFAULT 'pending' CHECK (tx_status IN ('pending', 'confirmed', 'failed')),
    block_number   BIGINT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_og_purchases_wallet ON og_purchases (wallet_address, created_at DESC);

ALTER TABLE og_pricing   ENABLE ROW LEVEL SECURITY;
ALTER TABLE og_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "og_pricing_public_read" ON og_pricing
    FOR SELECT TO anon, authenticated USING (true);

-- purchase_og: verifies the wallet isn't already OG, records the purchase
-- (idempotent on tx_ref), and flips is_og + og_member_since_block. The
-- member-since block comes from the on-chain receipt (see api/og/purchase),
-- so it can't be backdated.
CREATE OR REPLACE FUNCTION purchase_og(
    p_wallet_address TEXT,
    p_amount_usdc    NUMERIC(18, 6),
    p_tx_ref         TEXT,
    p_block_number   BIGINT
) RETURNS og_purchases AS $$
DECLARE
    v_expected_price NUMERIC(18, 6);
    v_already_og     BOOLEAN;
    v_purchase       og_purchases;
BEGIN
    SELECT price_usdc INTO v_expected_price FROM og_pricing WHERE id = TRUE;
    IF p_amount_usdc <> v_expected_price THEN
        RAISE EXCEPTION 'Payment amount (%) does not match the OG price (%)', p_amount_usdc, v_expected_price;
    END IF;

    SELECT is_og INTO v_already_og FROM profiles WHERE wallet_address = p_wallet_address;
    IF v_already_og THEN
        RAISE EXCEPTION 'Wallet % is already OG', p_wallet_address;
    END IF;

    UPDATE profiles
        SET is_og = TRUE,
            og_member_since_block = p_block_number,
            updated_at = now()
        WHERE wallet_address = p_wallet_address;

    INSERT INTO og_purchases (wallet_address, amount_usdc, tx_ref, block_number)
        VALUES (p_wallet_address, p_amount_usdc, p_tx_ref, p_block_number)
        ON CONFLICT (tx_ref) DO NOTHING
        RETURNING * INTO v_purchase;

    IF v_purchase IS NULL THEN
        SELECT * INTO v_purchase FROM og_purchases WHERE tx_ref = p_tx_ref;
    END IF;

    RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. quests: get_verified -> get_og, plus a new OG-exclusive quest.
-- (Reward payout for the exclusive quest is intentionally out of scope for
-- now — this just tracks progress/completion like the rest of the catalog.)
UPDATE quests SET quest_key = 'get_og' WHERE quest_key = 'get_verified';
