DELETE FROM posts p
USING posts dupe
WHERE p.repost_of IS NOT NULL
  AND p.repost_of = dupe.repost_of
  AND p.author_wallet = dupe.author_wallet
  AND p.deleted_at IS NULL
  AND dupe.deleted_at IS NULL
  AND (
    p.created_at > dupe.created_at
    OR (p.created_at = dupe.created_at AND p.id > dupe.id)
  );
