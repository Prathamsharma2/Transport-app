-- MIGRATION_V2.sql
-- Run this in your Supabase SQL editor to apply the current schema updates.

-- 1. Updates to trips table
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS consignor VARCHAR(255),
  ADD COLUMN IF NOT EXISTS consignee VARCHAR(255);

-- 2. Updates to expenses table to establish relations for global filtering
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL;

-- 3. Update the existing expenses to ensure they don't break with new logic (optional data fix up)
-- We can leave existing data as is, new data will populate these columns.
