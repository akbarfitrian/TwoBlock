-- 0020 added referral_code but deliberately didn't backfill it, on the
-- assumption the app had no real users yet at the time. That assumption
-- turned out to be wrong — wallets onboarded before 0020 shipped (i.e.
-- before assignReferralCode/ensureReferralCode ever ran for them) are
-- stuck with referral_code = NULL and have no way to generate one from
-- the UI. This backfills a code for every profile that's still missing
-- one, using the same alphabet/length as generateReferralCode() in
-- src/backend/lib/referral-code.ts, and retries on the rare collision.

DO $$
DECLARE
    v_wallet TEXT;
    v_code   TEXT;
    v_chars  TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_attempt INT;
BEGIN
    FOR v_wallet IN
        SELECT wallet_address FROM profiles WHERE referral_code IS NULL
    LOOP
        v_attempt := 0;
        LOOP
            v_code := '';
            FOR i IN 1..8 LOOP
                v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
            END LOOP;

            BEGIN
                UPDATE profiles SET referral_code = v_code WHERE wallet_address = v_wallet;
                EXIT; -- success
            EXCEPTION WHEN unique_violation THEN
                v_attempt := v_attempt + 1;
                IF v_attempt >= 5 THEN
                    RAISE NOTICE 'Could not generate a unique referral code for %', v_wallet;
                    EXIT;
                END IF;
            END;
        END LOOP;
    END LOOP;
END $$;
