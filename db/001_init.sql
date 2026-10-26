-- DealBotSA v0.4 Neon PostgreSQL schema
-- Re-runnable, non-destructive baseline.
-- Each browser guest is identified server-side by a SHA-256 hash of a secure HttpOnly cookie.
CREATE TABLE IF NOT EXISTS demo_guests(
 guest_hash text PRIMARY KEY,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS demo_price_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 guest_hash text NOT NULL REFERENCES demo_guests(guest_hash) ON DELETE CASCADE,
 product_id text NOT NULL,
 product_name text NOT NULL,
 previous_price numeric(12,2) NOT NULL CHECK(previous_price>=0),
 new_price numeric(12,2) NOT NULL CHECK(new_price>=0),
 source_type text NOT NULL DEFAULT 'simulation' CHECK(source_type IN ('simulation','manual','live')),
 observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demo_price_events_guest_idx ON demo_price_events(guest_hash,observed_at DESC);
CREATE TABLE IF NOT EXISTS demo_delivery_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 guest_hash text NOT NULL REFERENCES demo_guests(guest_hash) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('in-app','telegram','whatsapp')),
 status text NOT NULL CHECK(status IN ('delivered','failed','pending','demo')),
 subject text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demo_delivery_guest_idx ON demo_delivery_events(guest_hash,created_at DESC);
