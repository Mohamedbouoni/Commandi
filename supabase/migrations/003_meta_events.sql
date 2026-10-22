-- =============================================================================
-- Commandi — Meta webhook event log
-- =============================================================================
-- Migration: 003_meta_events
-- Raw Messenger / Instagram webhook payloads, written by the server with the
-- service role only. Step 2 (inbox) turns these into conversations; until
-- then the log lets us watch messages arrive while setting up the Meta app.
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS meta_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- "page" (Messenger) or "instagram"
    object TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_events_received ON meta_events(received_at DESC);

-- RLS on with no policies: only the service role (the webhook) can read/write
ALTER TABLE meta_events ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
