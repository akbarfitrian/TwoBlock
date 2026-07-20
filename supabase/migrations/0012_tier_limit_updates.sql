-- Updated product rules for both tiers. Actual enforcement lives in
-- src/shared/tier-limits.ts (client cache + server-enforced source of
-- truth); this table is kept in sync purely for reference/consistency.
--
--   Free: 5 posts/day, 250 chars, images + polls included, no edit, no gating
--   OG:   20 posts/day, 10,000 chars, images + polls + edit (5 min) + gating

UPDATE og_pricing
SET daily_post_limit = 20,
    max_post_chars   = 10000,
    can_attach_image = TRUE,
    can_edit_post    = TRUE,
    can_create_poll  = TRUE
WHERE id = TRUE;
