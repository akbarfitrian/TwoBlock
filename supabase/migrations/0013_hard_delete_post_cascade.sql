-- Deleting a post now removes it permanently (hard delete). Previously
-- `repost_of` and `tips.post_id` were ON DELETE SET NULL, which would have
-- orphaned reposts and tips instead of removing them. Switch both to
-- ON DELETE CASCADE so reposts of a deleted post, and tips sent to a
-- deleted post, are removed along with it.
-- (post_reactions and poll_votes already cascade — see 0001_init.sql.)

ALTER TABLE posts
    DROP CONSTRAINT IF EXISTS posts_repost_of_fkey,
    ADD CONSTRAINT posts_repost_of_fkey
        FOREIGN KEY (repost_of) REFERENCES posts (id) ON DELETE CASCADE;

ALTER TABLE tips
    DROP CONSTRAINT IF EXISTS tips_post_id_fkey,
    ADD CONSTRAINT tips_post_id_fkey
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE;
