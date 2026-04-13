CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'staff',
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.loads (
  id BIGSERIAL PRIMARY KEY,
  pickup TEXT, drop_location TEXT, weight INT, truck_type VARCHAR(100),
  price INT, consignor VARCHAR(255) DEFAULT 'Not Assigned',
  consignee VARCHAR(255) DEFAULT 'Not Assigned', status VARCHAR(50) DEFAULT 'PENDING',
  gr VARCHAR(100), fright INT, payment INT, box VARCHAR(100),
  station VARCHAR(255), from_to VARCHAR(255), bal INT, sur INT, shortage INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.vehicles (
  id BIGSERIAL PRIMARY KEY, vehicle_number VARCHAR(100), type VARCHAR(100),
  make VARCHAR(100), model VARCHAR(100), capacity INT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.drivers (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(191), phone VARCHAR(50),
  license_number VARCHAR(100), aadhaar_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'AVAILABLE', joined_date DATE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.trips (
  id BIGSERIAL PRIMARY KEY,
  load_id BIGINT REFERENCES loads(id) ON DELETE SET NULL,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
  start_location VARCHAR(255), end_location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES trips(id) ON DELETE CASCADE,
  category VARCHAR(100), type VARCHAR(200), amount INT,
  date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.invoices (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES trips(id) ON DELETE SET NULL,
  amount INT, rate INT, freight INT, advance INT, balance INT,
  other_charges INT, insurance_company VARCHAR(255), policy_no VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW(), paid_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.app_updates (
  id BIGSERIAL PRIMARY KEY, version VARCHAR(50) UNIQUE, url TEXT,
  platform VARCHAR(10), release_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY, title VARCHAR(255), message TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id BIGSERIAL PRIMARY KEY, date VARCHAR(50), truck_no VARCHAR(100), station VARCHAR(150),
  gr VARCHAR(100), weight VARCHAR(100), fright VARCHAR(100), payment VARCHAR(100),
  box VARCHAR(100), from_to VARCHAR(150), bal VARCHAR(100), sur VARCHAR(100),
  shortage VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loads_auth" ON public.loads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_auth" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "drivers_auth" ON public.drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "trips_auth" ON public.trips FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_auth" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_auth" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app_updates_auth" ON public.app_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_auth" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ledger_auth" ON public.ledger_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profile_owner" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profile_anon_read" ON public.profiles FOR SELECT TO anon USING (true);
