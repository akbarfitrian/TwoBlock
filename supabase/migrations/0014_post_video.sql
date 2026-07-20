-- Adds short-video attachments to posts, alongside the existing image
-- support. A post can carry images OR a single video, not both — this
-- mirrors the existing image/poll mutual exclusivity in 0001_init.sql.

ALTER TABLE posts ADD COLUMN video_url TEXT;

ALTER TABLE posts
    DROP CONSTRAINT IF EXISTS repost_has_no_own_content,
    ADD CONSTRAINT repost_has_no_own_content CHECK (
        repost_of IS NULL OR (
            content IS NULL
            AND post_type = 'text'
            AND array_length(image_urls, 1) IS NULL
            AND video_url IS NULL
        )
    );

ALTER TABLE posts
    ADD CONSTRAINT media_is_exclusive CHECK (
        video_url IS NULL OR array_length(image_urls, 1) IS NULL
    );

-- New storage bucket for short video attachments. Kept separate from
-- post-images since videos need a much higher size limit (10MB, vs the 2MB
-- image cap from 0007_lower_upload_size_limit.sql) and a different set of
-- allowed MIME types.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-videos', 'post-videos', true, 10485760, array['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "post_videos_public_read" ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'post-videos');

CREATE POLICY "post_videos_public_insert" ON storage.objects
    FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'post-videos');
