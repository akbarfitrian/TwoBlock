// Comments are flat-rate (no OG-tier scaling like posts have) — everyone
// gets the same limit. Keep this in sync with the comment_content_length
// check constraint in supabase/migrations/0018_comments.sql.
export const MAX_COMMENT_CHARS = 500;
