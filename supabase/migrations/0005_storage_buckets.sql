insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
    ('post-images', 'post-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
    for select to anon, authenticated using (bucket_id = 'avatars');

create policy "post_images_public_read" on storage.objects
    for select to anon, authenticated using (bucket_id = 'post-images');

create policy "avatars_public_insert" on storage.objects
    for insert to anon, authenticated with check (bucket_id = 'avatars');

create policy "post_images_public_insert" on storage.objects
    for insert to anon, authenticated with check (bucket_id = 'post-images');
