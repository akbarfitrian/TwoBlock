-- Text-only comments on posts. Comments support the same @mention and link
-- rendering as posts (handled client-side by src/frontend/lib/linkify.tsx),
-- so no special storage is needed for mentions beyond the plain text.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mention';

CREATE TABLE comments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id        UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    author_wallet  TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    content        TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT comment_content_length CHECK (char_length(content) BETWEEN 1 AND 500)
);

CREATE INDEX idx_comments_post ON comments (post_id, created_at);
CREATE INDEX idx_comments_author ON comments (author_wallet, created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_public_read" ON comments
    FOR SELECT TO anon, authenticated USING (true);

-- Let notifications point at the specific comment that triggered them
-- (a new comment on your post, or a comment that @mentions you).
ALTER TABLE notifications ADD COLUMN comment_id UUID REFERENCES comments (id) ON DELETE CASCADE;
