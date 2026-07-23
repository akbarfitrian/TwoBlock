-- Points & referral system — see POINTS_REFERRAL_SYSTEM.md for the full
-- design rationale. Purely a retention/gamification layer on top of OG
-- membership: does not touch payments, contracts, or OG's functional
-- benefits (post quotas, gating, etc).
--
-- Points start counting from a wallet's first activity in the app (not
-- from the moment they buy OG), are soulbound (never transferable), and
-- are NOT backfilled for existing wallets — everyone starts at 0 the day
-- this ships (moot in practice, the app has no real users yet).

ALTER TABLE profiles ADD COLUMN total_points        NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN referral_code       TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN referred_by         TEXT REFERENCES profiles (wallet_address)
    CHECK (referred_by <> wallet_address);
ALTER TABLE profiles ADD COLUMN referral_slots_used INT NOT NULL DEFAULT 0;

CREATE INDEX idx_profiles_referral_code ON profiles (referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_profiles_referred_by ON profiles (referred_by) WHERE referred_by IS NOT NULL;

CREATE TABLE point_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    event_type     TEXT NOT NULL,
    points         NUMERIC(14,2) NOT NULL,
    ref_id         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_point_events_wallet ON point_events (wallet_address);
CREATE INDEX idx_point_events_wallet_type_date ON point_events (wallet_address, event_type, created_at);

-- One-time events only (quest completions, OG bonus) are deduped by ref_id.
-- Repeatable events (tip_sent, tip_received, referral_commission, daily_*)
-- deliberately are NOT covered by this constraint — their own dedup lives
-- elsewhere (daily_quests PK for daily_*, the daily point cap for tips,
-- and the "commission never generates further commission" guard below).
CREATE UNIQUE INDEX idx_point_events_onetime
    ON point_events (wallet_address, event_type, ref_id)
    WHERE event_type IN ('quest_completed', 'og_purchase_bonus');

ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_events_public_read" ON point_events
    FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE daily_quests (
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    quest_key      TEXT NOT NULL,
    quest_date     DATE NOT NULL,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (wallet_address, quest_key, quest_date)
);

ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_quests_public_read" ON daily_quests
    FOR SELECT TO anon, authenticated USING (true);

-- Badge tier -> referral slot capacity. Mirrored 1:1 in
-- src/shared/badge-tiers.ts (getBadgeTier / referralSlotCapacity) which is
-- the single source of truth on the frontend — keep both in sync if the
-- thresholds ever change.
CREATE OR REPLACE FUNCTION referral_slot_capacity(p_points NUMERIC) RETURNS INT AS $$
BEGIN
    IF p_points >= 1000000 THEN RETURN 6;
    ELSIF p_points >= 100000 THEN RETURN 5;
    ELSIF p_points >= 10000  THEN RETURN 4;
    ELSIF p_points >= 1000   THEN RETURN 3;
    ELSIF p_points >= 100    THEN RETURN 2;
    ELSIF p_points >= 10     THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- award_points: the single entry point for granting points. Handles the
-- optional daily cap (used by tip_sent/tip_received) and, for anything
-- other than a commission payout itself, pays the wallet's direct
-- referrer (if any) a 5% commission as a separate point_events row.
-- referral_commission events never recurse into further commission —
-- belt-and-suspenders on top of the 1-level-only referral design.
CREATE OR REPLACE FUNCTION award_points(
    p_wallet_address TEXT,
    p_event_type     TEXT,
    p_points         NUMERIC(14,2),
    p_ref_id         TEXT DEFAULT NULL,
    p_daily_cap      NUMERIC(14,2) DEFAULT NULL   -- NULL = no daily cap
) RETURNS void AS $$
DECLARE
    v_today_total NUMERIC(14,2);
    v_awardable   NUMERIC(14,2);
    v_referrer    TEXT;
    v_commission  NUMERIC(14,2);
    v_inserted_id UUID;
BEGIN
    IF p_points IS NULL OR p_points <= 0 THEN RETURN; END IF;

    v_awardable := p_points;

    IF p_daily_cap IS NOT NULL THEN
        SELECT COALESCE(SUM(points), 0) INTO v_today_total
        FROM point_events
        WHERE wallet_address = p_wallet_address
          AND event_type = p_event_type
          AND (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;

        v_awardable := GREATEST(0, LEAST(p_points, p_daily_cap - v_today_total));
        IF v_awardable = 0 THEN RETURN; END IF;
    END IF;

    INSERT INTO point_events (wallet_address, event_type, points, ref_id)
    VALUES (p_wallet_address, p_event_type, v_awardable, p_ref_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NULL THEN RETURN; END IF;

    UPDATE profiles SET total_points = total_points + v_awardable
    WHERE wallet_address = p_wallet_address;

    IF p_event_type <> 'referral_commission' THEN
        SELECT referred_by INTO v_referrer FROM profiles WHERE wallet_address = p_wallet_address;
        IF v_referrer IS NOT NULL THEN
            v_commission := ROUND(v_awardable * 0.05, 2);
            IF v_commission > 0 THEN
                INSERT INTO point_events (wallet_address, event_type, points, ref_id)
                VALUES (v_referrer, 'referral_commission', v_commission, p_ref_id);

                UPDATE profiles SET total_points = total_points + v_commission
                WHERE wallet_address = v_referrer;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- apply_referral: sets referred_by exactly once (permanent — no
-- "jumping" referrers later) and increments the referrer's slot usage,
-- gated by their *current* tier capacity. Fails gracefully with
-- 'slots_full' rather than erroring, so the caller can let the wallet
-- onboard referrer-less and retry the same or a different code later.
CREATE OR REPLACE FUNCTION apply_referral(
    p_wallet_address TEXT,
    p_referral_code  TEXT
) RETURNS TABLE(success BOOLEAN, reason TEXT) AS $$
DECLARE
    v_referrer_wallet  TEXT;
    v_referrer_points  NUMERIC(14,2);
    v_slots_used       INT;
    v_already_referred TEXT;
BEGIN
    IF p_referral_code IS NULL OR length(trim(p_referral_code)) = 0 THEN
        RETURN QUERY SELECT FALSE, 'invalid_code'; RETURN;
    END IF;

    SELECT referred_by INTO v_already_referred FROM profiles WHERE wallet_address = p_wallet_address;
    IF v_already_referred IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'already_has_referrer'; RETURN;
    END IF;

    SELECT wallet_address, total_points, referral_slots_used
        INTO v_referrer_wallet, v_referrer_points, v_slots_used
        FROM profiles WHERE referral_code = p_referral_code
        FOR UPDATE;

    IF v_referrer_wallet IS NULL THEN
        RETURN QUERY SELECT FALSE, 'invalid_code'; RETURN;
    END IF;
    IF v_referrer_wallet = p_wallet_address THEN
        RETURN QUERY SELECT FALSE, 'self_referral'; RETURN;
    END IF;
    IF v_slots_used >= referral_slot_capacity(v_referrer_points) THEN
        RETURN QUERY SELECT FALSE, 'slots_full'; RETURN;
    END IF;

    UPDATE profiles SET referral_slots_used = referral_slots_used + 1 WHERE wallet_address = v_referrer_wallet;
    UPDATE profiles SET referred_by = v_referrer_wallet WHERE wallet_address = p_wallet_address;

    RETURN QUERY SELECT TRUE, 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
