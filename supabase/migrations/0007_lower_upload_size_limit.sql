update storage.buckets
set file_size_limit = 2097152
where id in ('avatars', 'post-images');
