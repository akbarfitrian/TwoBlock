CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE verification_tier AS ENUM ('free', 'verified', 'verified_pro', 'verified_max');
CREATE TYPE post_type AS ENUM ('text', 'poll');
CREATE TYPE reaction_type AS ENUM ('agree', 'disagree');
CREATE TYPE notification_type AS ENUM ('follow', 'repost', 'tip', 'reaction', 'poll_result');

CREATE OR REPLACE FUNCTION max_images_for_tier(tier verification_tier)
RETURNS INT AS $$
  SELECT CASE tier
    WHEN 'free'          THEN 1
    WHEN 'verified'      THEN 4
    WHEN 'verified_pro'  THEN 8
    WHEN 'verified_max'  THEN 12
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE profiles (
    wallet_address          TEXT PRIMARY KEY,
    username                TEXT UNIQUE,
    bio                     TEXT,
    avatar_url              TEXT,
    verification_tier       verification_tier NOT NULL DEFAULT 'free',
    verification_expires_at TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,20}$'),
    CONSTRAINT expiry_required_if_paid CHECK (
        (verification_tier = 'free' AND verification_expires_at IS NULL)
        OR (verification_tier <> 'free')
    )
);

CREATE INDEX idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_tier ON profiles (verification_tier) WHERE verification_tier <> 'free';

CREATE TABLE posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_wallet   TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    content         TEXT,
    image_urls      TEXT[] NOT NULL DEFAULT '{}',
    post_type       post_type NOT NULL DEFAULT 'text',
    repost_of       UUID REFERENCES posts (id) ON DELETE SET NULL,

    poll_options    JSONB,
    poll_expires_at TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT poll_fields_required CHECK (
        (post_type = 'text' AND poll_options IS NULL)
        OR (post_type = 'poll' AND poll_options IS NOT NULL
            AND jsonb_array_length(poll_options) BETWEEN 2 AND 4)
    ),
    CONSTRAINT repost_has_no_own_content CHECK (
        repost_of IS NULL OR (content IS NULL AND post_type = 'text' AND array_length(image_urls, 1) IS NULL)
    )
);

CREATE INDEX idx_posts_author ON posts (author_wallet, created_at DESC);
CREATE INDEX idx_posts_feed ON posts (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_repost_of ON posts (repost_of) WHERE repost_of IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_image_limit() RETURNS TRIGGER AS $$
DECLARE
    author_tier verification_tier;
BEGIN
    SELECT verification_tier INTO author_tier FROM profiles WHERE wallet_address = NEW.author_wallet;
    IF array_length(NEW.image_urls, 1) > max_images_for_tier(author_tier) THEN
        RAISE EXCEPTION 'Jumlah gambar (%) melebihi batas tier % (maks %)',
            array_length(NEW.image_urls, 1), author_tier, max_images_for_tier(author_tier);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_image_limit
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION enforce_image_limit();

CREATE TABLE follows (
    follower_wallet  TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    following_wallet TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (follower_wallet, following_wallet),
    CONSTRAINT no_self_follow CHECK (follower_wallet <> following_wallet)
);

CREATE INDEX idx_follows_following ON follows (following_wallet);

CREATE TABLE tips (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet  TEXT NOT NULL REFERENCES profiles (wallet_address),
    to_wallet    TEXT NOT NULL REFERENCES profiles (wallet_address),
    post_id      UUID REFERENCES posts (id) ON DELETE SET NULL,
    amount_usdc  NUMERIC(18, 6) NOT NULL CHECK (amount_usdc > 0),
    tx_ref       TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT no_self_tip CHECK (from_wallet <> to_wallet)
);

CREATE INDEX idx_tips_to_wallet ON tips (to_wallet, created_at DESC);
CREATE INDEX idx_tips_post ON tips (post_id) WHERE post_id IS NOT NULL;

CREATE TABLE post_reactions (
    post_id        UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    reaction_type  reaction_type NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (post_id, wallet_address)
);

CREATE INDEX idx_reactions_post ON post_reactions (post_id, reaction_type);

CREATE TABLE poll_votes (
    post_id        UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    option_index   SMALLINT NOT NULL CHECK (option_index >= 0 AND option_index < 4),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (post_id, wallet_address)
);

CREATE INDEX idx_poll_votes_tally ON poll_votes (post_id, option_index);

CREATE OR REPLACE FUNCTION enforce_poll_vote_rules() RETURNS TRIGGER AS $$
DECLARE
    p_type post_type;
    p_expires TIMESTAMPTZ;
    p_option_count INT;
BEGIN
    SELECT post_type, poll_expires_at, jsonb_array_length(poll_options)
        INTO p_type, p_expires, p_option_count
        FROM posts WHERE id = NEW.post_id;

    IF p_type IS DISTINCT FROM 'poll' THEN
        RAISE EXCEPTION 'Post % bukan polling', NEW.post_id;
    END IF;
    IF p_expires IS NOT NULL AND now() > p_expires THEN
        RAISE EXCEPTION 'Polling sudah berakhir, vote ditutup';
    END IF;
    IF NEW.option_index >= p_option_count THEN
        RAISE EXCEPTION 'option_index % di luar jangkauan opsi polling', NEW.option_index;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_poll_vote_rules
    BEFORE INSERT ON poll_votes
    FOR EACH ROW EXECUTE FUNCTION enforce_poll_vote_rules();

CREATE OR REPLACE FUNCTION forbid_poll_vote_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Vote polling bersifat final dan tidak dapat diubah/dihapus';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forbid_poll_vote_update
    BEFORE UPDATE OR DELETE ON poll_votes
    FOR EACH ROW EXECUTE FUNCTION forbid_poll_vote_mutation();

CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_key        TEXT NOT NULL,
    from_wallet       TEXT NOT NULL REFERENCES profiles (wallet_address),
    to_wallet         TEXT NOT NULL REFERENCES profiles (wallet_address),
    content           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_by_sender BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT no_self_message CHECK (from_wallet <> to_wallet)
);

CREATE INDEX idx_messages_thread ON messages (thread_key, created_at);
CREATE INDEX idx_messages_to_wallet ON messages (to_wallet, created_at DESC);

CREATE OR REPLACE FUNCTION generate_thread_key() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.from_wallet < NEW.to_wallet THEN
        NEW.thread_key := NEW.from_wallet || ':' || NEW.to_wallet;
    ELSE
        NEW.thread_key := NEW.to_wallet || ':' || NEW.from_wallet;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_thread_key
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION generate_thread_key();

CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    actor_wallet     TEXT REFERENCES profiles (wallet_address),
    type             notification_type NOT NULL,
    post_id          UUID REFERENCES posts (id) ON DELETE CASCADE,
    tip_id           UUID REFERENCES tips (id) ON DELETE CASCADE,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_wallet, is_read, created_at DESC);

CREATE TABLE quests (
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    quest_key      TEXT NOT NULL,
    progress       INT NOT NULL DEFAULT 0,
    target         INT NOT NULL DEFAULT 1,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (wallet_address, quest_key)
);

CREATE INDEX idx_quests_incomplete ON quests (wallet_address) WHERE completed_at IS NULL;

CREATE OR REPLACE VIEW leaderboard_alltime AS
SELECT to_wallet AS wallet_address, SUM(amount_usdc) AS total_tips_received, COUNT(*) AS tip_count
FROM tips
GROUP BY to_wallet
ORDER BY total_tips_received DESC;

CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT to_wallet AS wallet_address, SUM(amount_usdc) AS total_tips_received, COUNT(*) AS tip_count
FROM tips
WHERE created_at >= date_trunc('week', now())
GROUP BY to_wallet
ORDER BY total_tips_received DESC;

CREATE OR REPLACE VIEW post_leaderboard_alltime AS
SELECT post_id, SUM(amount_usdc) AS total_tips_received
FROM tips
WHERE post_id IS NOT NULL
GROUP BY post_id
ORDER BY total_tips_received DESC;
