alter table profiles
    add column if not exists username_changed_at timestamptz;

update profiles
set username_changed_at = updated_at
where username is not null and username_changed_at is null;
