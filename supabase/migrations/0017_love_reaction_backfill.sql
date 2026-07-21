-- Collapse any existing agree/disagree reactions into love, one row per
-- (post, wallet) since the unique constraint is on that pair.
UPDATE post_reactions
SET reaction_type = 'love'
WHERE reaction_type IN ('agree', 'disagree')
  AND NOT EXISTS (
    SELECT 1 FROM post_reactions p2
    WHERE p2.post_id = post_reactions.post_id
      AND p2.wallet_address = post_reactions.wallet_address
      AND p2.reaction_type = 'love'
  );

DELETE FROM post_reactions WHERE reaction_type IN ('agree', 'disagree');
