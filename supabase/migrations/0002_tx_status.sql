ALTER TABLE tips
    ADD COLUMN tx_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (tx_status IN ('pending', 'confirmed', 'failed'));

CREATE INDEX idx_tips_pending ON tips (tx_status) WHERE tx_status = 'pending';
