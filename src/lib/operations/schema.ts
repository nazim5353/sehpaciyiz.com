// PostgreSQL schema used only by the local company-panel database. Storefront data is unchanged.
export const operationsSchema = `
CREATE TABLE IF NOT EXISTS ops_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS ops_users (
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
 email text NOT NULL UNIQUE CHECK(email = lower(email)), password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('OWNER','STAFF')), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ops_one_owner ON ops_users(role) WHERE role='OWNER';
CREATE TABLE IF NOT EXISTS ops_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_sessions_user ON ops_sessions(user_id, expires_at);
CREATE TABLE IF NOT EXISTS ops_login_attempts (key text PRIMARY KEY, attempts integer NOT NULL CHECK(attempts>=0), until_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS ops_accounts (
 id uuid PRIMARY KEY, name text NOT NULL UNIQUE, type text NOT NULL CHECK(type IN ('CASH','BANK')),
 opening_minor bigint NOT NULL DEFAULT 0 CHECK(abs(opening_minor)<=100000000000), opening_date date NOT NULL,
 created_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS ops_records (
 id uuid PRIMARY KEY, request_hash text NOT NULL, number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 kind text NOT NULL CHECK(kind IN ('SALE','PRODUCT_PURCHASE','MATERIAL_PURCHASE','EXPENSE','TAX')),
 business_date date NOT NULL, channel text CHECK(channel IN ('WEB','INSTAGRAM','TRENDYOL','HEPSIBURADA','STORE')),
 party text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', document_no text NOT NULL DEFAULT '', due_date date,
 amount_minor bigint NOT NULL CHECK(amount_minor>0 AND amount_minor<=100000000000),
 lines jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(lines)='array'),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','CANCELED')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='SALE' AND channel IS NOT NULL) OR (kind<>'SALE' AND channel IS NULL))
);
CREATE INDEX IF NOT EXISTS ops_records_date_number ON ops_records(business_date DESC, number DESC);
CREATE INDEX IF NOT EXISTS ops_records_creator_date_number ON ops_records(created_by,business_date DESC,number DESC);
CREATE INDEX IF NOT EXISTS ops_records_channel ON ops_records(channel,business_date DESC) WHERE kind='SALE' AND status='ACTIVE';
CREATE INDEX IF NOT EXISTS ops_records_due ON ops_records(due_date) WHERE status='ACTIVE';
CREATE TABLE IF NOT EXISTS ops_payments (
 id uuid PRIMARY KEY, request_hash text NOT NULL, record_id uuid NOT NULL REFERENCES ops_records(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES ops_accounts(id) ON DELETE RESTRICT, business_date date NOT NULL,
 method text NOT NULL CHECK(method IN ('CASH','CARD','BANK')), gross_minor bigint NOT NULL CHECK(gross_minor>0 AND gross_minor<=100000000000),
 commission_minor bigint NOT NULL DEFAULT 0 CHECK(commission_minor>=0), shipping_minor bigint NOT NULL DEFAULT 0 CHECK(shipping_minor>=0),
 net_minor bigint NOT NULL CHECK(net_minor>=0), refund boolean NOT NULL DEFAULT false,
 description text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(net_minor=gross_minor-commission_minor-shipping_minor), CHECK(NOT refund OR (commission_minor=0 AND shipping_minor=0))
);
CREATE INDEX IF NOT EXISTS ops_payments_record ON ops_payments(record_id);
CREATE INDEX IF NOT EXISTS ops_payments_date ON ops_payments(business_date);
CREATE INDEX IF NOT EXISTS ops_payments_account_date ON ops_payments(account_id,business_date);
CREATE INDEX IF NOT EXISTS ops_payments_creator ON ops_payments(created_by);
CREATE TABLE IF NOT EXISTS ops_transfers (
 id uuid PRIMARY KEY, source_id uuid NOT NULL REFERENCES ops_accounts(id) ON DELETE RESTRICT,
 target_id uuid NOT NULL REFERENCES ops_accounts(id) ON DELETE RESTRICT,
 amount_minor bigint NOT NULL CHECK(amount_minor>0 AND amount_minor<=100000000000), business_date date NOT NULL,
 description text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 CHECK(source_id<>target_id)
);
CREATE INDEX IF NOT EXISTS ops_transfers_source ON ops_transfers(source_id,business_date);
CREATE INDEX IF NOT EXISTS ops_transfers_target ON ops_transfers(target_id,business_date);
CREATE TABLE IF NOT EXISTS ops_product_costs (
 product_ref text PRIMARY KEY, unit_cost_minor bigint NOT NULL CHECK(unit_cost_minor>=0 AND unit_cost_minor<=100000000000),
 updated_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_amendments (
 id uuid PRIMARY KEY, record_id uuid NOT NULL REFERENCES ops_records(id) ON DELETE RESTRICT,
 requested_by uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 record_version integer NOT NULL, action text NOT NULL CHECK(action IN ('EDIT','CANCEL')),
 proposed jsonb, reason text NOT NULL CHECK(length(reason)>=5),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 decided_by uuid REFERENCES ops_users(id) ON DELETE RESTRICT, decision_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS ops_amendments_pending ON ops_amendments(created_at) WHERE status='PENDING';
CREATE INDEX IF NOT EXISTS ops_amendments_record ON ops_amendments(record_id);
CREATE INDEX IF NOT EXISTS ops_amendments_requester ON ops_amendments(requested_by);
CREATE TABLE IF NOT EXISTS ops_audit (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES ops_users(id) ON DELETE RESTRICT,
 action text NOT NULL, record_id uuid REFERENCES ops_records(id) ON DELETE RESTRICT,
 detail text NOT NULL DEFAULT '', before_data jsonb, after_data jsonb, at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_audit_date ON ops_audit(at DESC);
CREATE INDEX IF NOT EXISTS ops_audit_record ON ops_audit(record_id,at DESC);
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ops_runtime') THEN CREATE ROLE ops_runtime NOLOGIN; END IF; END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ops_runtime;
GRANT SELECT,INSERT,UPDATE ON ops_users,ops_sessions,ops_login_attempts,ops_accounts,ops_records,ops_product_costs,ops_amendments TO ops_runtime;
GRANT SELECT,INSERT ON ops_payments,ops_transfers,ops_audit TO ops_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ops_runtime;
INSERT INTO ops_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
`;
