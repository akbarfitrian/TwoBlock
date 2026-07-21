-- Lowers all image/video attachment size caps to match the new
-- client-side validation in src/frontend/lib/upload.ts:
-- avatars 2MB -> 1MB, post images 2MB -> 1MB, post videos 10MB -> 2MB.
update storage.buckets
set file_size_limit = 1048576
where id in ('avatars', 'post-images');

update storage.buckets
set file_size_limit = 2097152
where id = 'post-videos';
