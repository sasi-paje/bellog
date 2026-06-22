-- Enable Realtime for Bellog Tables
-- Run this SQL in Supabase Dashboard > SQL Editor

-- Enable realtime for trx_route
ALTER PUBLICATION supabase_realtime ADD TABLE trx_route;

-- Enable realtime for trx_fiscal_invoice
ALTER PUBLICATION supabase_realtime ADD TABLE trx_fiscal_invoice;

-- Enable realtime for master_fleet_vehicle
ALTER PUBLICATION supabase_realtime ADD TABLE master_fleet_vehicle;

-- Enable realtime for master_person_driver
ALTER PUBLICATION supabase_realtime ADD TABLE master_person_driver;

-- Enable realtime for master_person_company
ALTER PUBLICATION supabase_realtime ADD TABLE master_person_company;

-- Grant REPLICA IDENTITY for proper realtime updates
ALTER TABLE trx_route REPLICA IDENTITY FULL;
ALTER TABLE trx_fiscal_invoice REPLICA IDENTITY FULL;
ALTER TABLE master_fleet_vehicle REPLICA IDENTITY FULL;
ALTER TABLE master_person_driver REPLICA IDENTITY FULL;
ALTER TABLE master_person_company REPLICA IDENTITY FULL;

-- Verify realtime is enabled
SELECT
  schemaname,
  tablename,
  replident
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('trx_route', 'trx_fiscal_invoice', 'master_fleet_vehicle', 'master_person_driver', 'master_person_company');