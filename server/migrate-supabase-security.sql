-- Supabase Security Update Migration
-- This script ensures all tables in the 'public' schema have explicit GRANTs 
-- to 'anon' and 'authenticated' roles, as required by the May 30, 2026 update.

-- 1. Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant access to all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Grant access to all existing sequences (required for SERIAL/IDENTITY columns)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Set default privileges for tables created in the future
-- This ensures that any new table created automatically gets these permissions.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated;

-- Note: This script assumes you want the Supabase Data API (PostgREST) 
-- to have CRUD access to all tables. If you want to restrict specific tables,
-- you can REVOKE permissions after running this script.
