export const migration = `
CREATE TABLE IF NOT EXISTS transaction_lock (id integer PRIMARY KEY);
INSERT INTO transaction_lock (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, handle text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO users(id,handle) VALUES ('demo-shopper','Shared demo shopper') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS merchants (id text PRIMARY KEY, name text NOT NULL);
INSERT INTO merchants VALUES ('store-a','Northstar Goods'),('store-b','Fieldwork Supply') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS checkout_sessions (id text PRIMARY KEY, user_id text NOT NULL, merchant_id text NOT NULL REFERENCES merchants(id), version integer NOT NULL CHECK(version > 0), state text NOT NULL, total_minor integer NOT NULL CHECK(total_minor >= 0), expires_at timestamptz NOT NULL, data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user ON checkout_sessions(user_id);
CREATE TABLE IF NOT EXISTS checkout_items (id text PRIMARY KEY, session_id text NOT NULL REFERENCES checkout_sessions(id), sku text NOT NULL, qty integer NOT NULL CHECK(qty > 0), unit_minor integer NOT NULL CHECK(unit_minor >= 0));
CREATE TABLE IF NOT EXISTS reviews (id text PRIMARY KEY, session_id text NOT NULL REFERENCES checkout_sessions(id), version integer NOT NULL, acknowledged_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_attempts (id text PRIMARY KEY, session_id text NOT NULL UNIQUE REFERENCES checkout_sessions(id), order_id text UNIQUE, create_request_id text NOT NULL UNIQUE, capture_request_id text NOT NULL UNIQUE, state text NOT NULL);
CREATE TABLE IF NOT EXISTS handoffs (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS payment_events (id text PRIMARY KEY, order_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS receipts (id text PRIMARY KEY, session_id text NOT NULL UNIQUE REFERENCES checkout_sessions(id), capture_id text NOT NULL UNIQUE, user_id text NOT NULL, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id text PRIMARY KEY, session_id text, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (id text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS authenticators (id text PRIMARY KEY, user_id text NOT NULL, public_key text NOT NULL, counter integer NOT NULL, backed_up boolean NOT NULL DEFAULT false);
`;
