-- Tracks, per wallet and per conversation thread, when that wallet last opened the thread.
-- Used to compute unread state for the Messages list and the sidebar badge.

CREATE TABLE message_reads (
    wallet_address TEXT NOT NULL REFERENCES profiles (wallet_address) ON DELETE CASCADE,
    thread_key     TEXT NOT NULL,
    last_read_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (wallet_address, thread_key)
);

CREATE INDEX idx_message_reads_wallet ON message_reads (wallet_address);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
