-- ============================================================
-- TMS FULL MIGRATION SCRIPT
-- Run this in Supabase SQL Editor (once)
-- Safe to re-run — uses IF NOT EXISTS / IF NOT EXISTS guards
-- ============================================================

-- ── 1. COMPANIES / PARTIES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'client',         -- client, transporter, both
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  gstin VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ENHANCE EXISTING TABLES ──────────────────────────────

-- loads
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS load_status VARCHAR(50) DEFAULT 'Pending';

-- trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trip_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS gr_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50) DEFAULT 'own';   -- own, outbound_outsourced, inbound_outsourced

-- expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_category VARCHAR(50) DEFAULT 'Other',  -- Fuel, Toll, Driver Salary, Maintenance, Other
  ADD COLUMN IF NOT EXISTS vendor VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available',    -- Available, Assigned, Maintenance
  ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_maintenance DATE,
  ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

-- drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS current_trip_id BIGINT;

-- ── 3. PARTY LEDGER ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.party_ledger (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE SET NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  truck_no VARCHAR(100),
  gr_number VARCHAR(100),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  weight NUMERIC(10,2),
  freight_amount NUMERIC(12,2) DEFAULT 0,
  payment_received NUMERIC(12,2) DEFAULT 0,
  shortage NUMERIC(12,2) DEFAULT 0,
  surcharge NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. OUTSOURCED TRIPS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outsourced_trips (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE SET NULL,
  direction VARCHAR(20) NOT NULL,            -- outbound, inbound
  client_name VARCHAR(255),
  transporter_name VARCHAR(255),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  trip_date DATE DEFAULT CURRENT_DATE,
  freight_received NUMERIC(12,2) DEFAULT 0,
  freight_paid NUMERIC(12,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'Pending',  -- Paid, Pending, Partial
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. PAYMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE SET NULL,
  company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_type VARCHAR(50) DEFAULT 'balance', -- advance, balance, full
  payment_status VARCHAR(50) DEFAULT 'Pending', -- Paid, Pending, Partial
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_mode VARCHAR(50),                   -- Cash, Bank Transfer, Cheque, UPI
  reference_no VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. MAINTENANCE LOGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_date DATE DEFAULT CURRENT_DATE,
  maintenance_type VARCHAR(100),             -- Oil Change, Tyre, Service, Repair, Other
  cost NUMERIC(12,2) DEFAULT 0,
  vendor VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsourced_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'companies_auth' AND tablename = 'companies') THEN
    CREATE POLICY "companies_auth" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'party_ledger_auth' AND tablename = 'party_ledger') THEN
    CREATE POLICY "party_ledger_auth" ON public.party_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outsourced_auth' AND tablename = 'outsourced_trips') THEN
    CREATE POLICY "outsourced_auth" ON public.outsourced_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_auth' AND tablename = 'payments') THEN
    CREATE POLICY "payments_auth" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'maintenance_auth' AND tablename = 'maintenance_logs') THEN
    CREATE POLICY "maintenance_auth" ON public.maintenance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 8. PERFORMANCE INDEXES ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_trip_date ON public.trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_company_id ON public.trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_party_ledger_company ON public.party_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_party_ledger_date ON public.party_ledger(entry_date);
CREATE INDEX IF NOT EXISTS idx_loads_status ON public.loads(load_status);
CREATE INDEX IF NOT EXISTS idx_loads_company ON public.loads(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);

-- ── 9. SEED DEFAULT COMPANY (KOGM) ───────────────────────────
INSERT INTO public.companies (name, type, contact_person)
VALUES ('KOGM', 'client', 'KOGM Contact')
ON CONFLICT (name) DO NOTHING;

-- Done!
SELECT 'Migration complete ✅' AS status;

-- ═══════════════════════════════════════════════════════════
-- HOW TO CREATE A LOGIN USER (run separately in SQL editor)
-- ═══════════════════════════════════════════════════════════
-- Username login uses pattern: username@tms.dhillonroadlines
-- 
-- To create user with username "admin" and password "1234":
--
--   SELECT supabase_admin.create_user(
--     '{"email":"admin@tms.dhillonroadlines","password":"1234","email_confirm":true}'::jsonb
--   );
--
-- OR use Supabase Dashboard → Authentication → Users → Add User:
--   Email:    admin@tms.dhillonroadlines
--   Password: yourpassword
--   (Check "Auto Confirm User")
--
-- Then login in TMS app with:
--   Username: admin
--   Password: yourpassword
-- ═══════════════════════════════════════════════════════════

