-- Dual-chain support (Arc + Giwa Sepolia). Tips and OG purchases can now
-- originate from either chain, so we need to know which one a given row
-- came from — mainly so the backend verifies the tx against the right
-- RPC/contract, and the UI links to the right block explorer.
--
-- IMPORTANT — what this migration deliberately does NOT do: it does not
-- make OG membership per-chain. `profiles.is_og` stays a single flag per
-- wallet (see 0010_og_membership.sql) and is NOT scoped by chain_id — an
-- OG purchase recorded here from *either* chain flips the same global
-- `is_og` flag. `og_purchases.chain_id` is purely provenance ("which chain
-- was this specific purchase tx on"), not a membership scope.
--
-- chain_id values are the same keys used by the frontend's chain registry
-- (see src/shared/chain.ts CHAIN_REGISTRY) — 'arc' | 'giwaSepolia' — kept
-- as free text rather than a DB enum so adding a future chain doesn't
-- require another migration just to widen a type.

ALTER TABLE tips
    ADD COLUMN chain_id TEXT NOT NULL DEFAULT 'arc'
        CHECK (chain_id IN ('arc', 'giwaSepolia'));

ALTER TABLE og_purchases
    ADD COLUMN chain_id TEXT NOT NULL DEFAULT 'arc'
        CHECK (chain_id IN ('arc', 'giwaSepolia'));

-- Existing rows predate multi-chain support and were all on Arc — the
-- DEFAULT 'arc' above already backfills them correctly, nothing further
-- to do there.

CREATE INDEX idx_tips_chain_id ON tips (chain_id);
CREATE INDEX idx_og_purchases_chain_id ON og_purchases (chain_id);

-- purchase_og: add p_chain_id (defaults to 'arc' so any not-yet-updated
-- caller keeps working unchanged). Membership logic is untouched — is_og
-- still flips globally regardless of which chain p_chain_id says the
-- purchase came from.
CREATE OR REPLACE FUNCTION purchase_og(
    p_wallet_address TEXT,
    p_amount_usdc    NUMERIC(18, 6),
    p_tx_ref         TEXT,
    p_block_number   BIGINT,
    p_chain_id       TEXT DEFAULT 'arc'
) RETURNS og_purchases AS $$
DECLARE
    v_expected_price NUMERIC(18, 6);
    v_already_og     BOOLEAN;
    v_purchase       og_purchases;
BEGIN
    IF p_chain_id NOT IN ('arc', 'giwaSepolia') THEN
        RAISE EXCEPTION 'Unknown chain_id: %', p_chain_id;
    END IF;

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

    INSERT INTO og_purchases (wallet_address, amount_usdc, tx_ref, block_number, chain_id)
        VALUES (p_wallet_address, p_amount_usdc, p_tx_ref, p_block_number, p_chain_id)
        ON CONFLICT (tx_ref) DO NOTHING
        RETURNING * INTO v_purchase;

    IF v_purchase IS NULL THEN
        SELECT * INTO v_purchase FROM og_purchases WHERE tx_ref = p_tx_ref;
    END IF;

    RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
