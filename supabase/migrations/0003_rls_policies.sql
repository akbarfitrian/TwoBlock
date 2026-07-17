ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "posts_public_read" ON posts
    FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

CREATE POLICY "follows_public_read" ON follows
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "tips_public_read" ON tips
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "post_reactions_public_read" ON post_reactions
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "poll_votes_public_read" ON poll_votes
    FOR SELECT TO anon, authenticated USING (true);
