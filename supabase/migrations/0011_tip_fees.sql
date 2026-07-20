-- Platform fee on tips: 5% for free wallets, 2% for OG wallets (see
-- FREE_TIP_FEE_BPS / OG_TIP_FEE_BPS in contracts/TwoBlockPayments.sol).
-- amount_usdc stays as the gross amount the sender paid (unchanged
-- meaning, so existing rows/reads don't need backfilling). fee_usdc and
-- net_amount_usdc are decoded from the on-chain Tipped event's new `fee`
-- field by api/tips, exactly like the rest of the tip data — never
-- trusted from the client.

-- No strict "fee + net = amount" CHECK here on purpose: the values are
-- derived from wei -> Number division in application code (see api/tips),
-- so they can differ from amount_usdc by a sub-micro-USDC floating-point
-- rounding error. That's fine for display/accounting; a hard equality
-- constraint would risk rejecting valid inserts over dust-level rounding.
ALTER TABLE tips ADD COLUMN fee_usdc        NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (fee_usdc >= 0);
ALTER TABLE tips ADD COLUMN net_amount_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (net_amount_usdc >= 0);
