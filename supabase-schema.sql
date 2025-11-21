-- Run this SQL in your Supabase SQL Editor
-- This creates all necessary tables with Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Inventory Table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id TEXT UNIQUE NOT NULL,
  flower_type TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'stems',
  location TEXT NOT NULL DEFAULT 'inventory',
  date_added TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Lines Table
CREATE TABLE production_lines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  active_recipe_id UUID,
  produced_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  flowers JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Production Line Items (boxes assigned to lines)
CREATE TABLE production_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id INTEGER REFERENCES production_lines(id) ON DELETE CASCADE,
  box_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT
);

-- Produced Bunches Table
CREATE TABLE produced_bunches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bunch_id TEXT UNIQUE NOT NULL,
  recipe_name TEXT NOT NULL,
  line_id INTEGER REFERENCES production_lines(id),
  produced_at TIMESTAMPTZ DEFAULT NOW(),
  produced_by TEXT,
  status TEXT DEFAULT 'completed'
);

-- Activity Log Table (track all actions)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_email TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize 10 production lines
INSERT INTO production_lines (name, status) VALUES
  ('Line 1', 'idle'),
  ('Line 2', 'idle'),
  ('Line 3', 'idle'),
  ('Line 4', 'idle'),
  ('Line 5', 'idle'),
  ('Line 6', 'idle'),
  ('Line 7', 'idle'),
  ('Line 8', 'idle'),
  ('Line 9', 'idle'),
  ('Line 10', 'idle');

-- Insert sample recipes
INSERT INTO recipes (recipe_id, name, flowers, created_by) VALUES
  ('R001', 'Classic Rose Bouquet', 
   '[{"type":"Roses","color":"Red","quantity":12},{"type":"Baby''s Breath","color":"White","quantity":5},{"type":"Greenery","color":"Mixed","quantity":3}]', 
   'system@admin.com'),
  
  ('R002', 'Spring Garden Mix', 
   '[{"type":"Tulips","color":"Yellow","quantity":6},{"type":"Daffodils","color":"Yellow","quantity":4},{"type":"Hyacinths","color":"Purple","quantity":3}]', 
   'system@admin.com'),
  
  ('R003', 'Romance Bundle', 
   '[{"type":"Roses","color":"Red","quantity":24},{"type":"Roses","color":"Pink","quantity":12},{"type":"Carnations","color":"Pink","quantity":6}]', 
   'system@admin.com'),
  
  ('R004', 'Tropical Paradise', 
   '[{"type":"Birds of Paradise","color":"Orange","quantity":5},{"type":"Anthuriums","color":"Red","quantity":4},{"type":"Orchids","color":"Purple","quantity":3}]', 
   'system@admin.com'),
  
  ('R005', 'Wedding Elegance', 
   '[{"type":"Roses","color":"White","quantity":10},{"type":"Lilies","color":"White","quantity":8},{"type":"Orchids","color":"White","quantity":5},{"type":"Baby''s Breath","color":"White","quantity":10}]', 
   'system@admin.com'),
  
  ('R006', 'Sunflower Delight', 
   '[{"type":"Sunflowers","color":"Yellow","quantity":7},{"type":"Daisies","color":"White","quantity":10},{"type":"Solidago","color":"Yellow","quantity":5}]', 
   'system@admin.com'),
  
  ('R007', 'Lavender Dreams', 
   '[{"type":"Lavender","color":"Purple","quantity":15},{"type":"Roses","color":"Lavender","quantity":8},{"type":"Limonium","color":"Purple","quantity":6}]', 
   'system@admin.com'),
  
  ('R008', 'Birthday Celebration', 
   '[{"type":"Gerbera Daisies","color":"Mixed","quantity":12},{"type":"Carnations","color":"Pink","quantity":8},{"type":"Alstroemeria","color":"Mixed","quantity":6}]', 
   'system@admin.com'),
  
  ('R009', 'Autumn Harvest', 
   '[{"type":"Chrysanthemums","color":"Orange","quantity":8},{"type":"Sunflowers","color":"Yellow","quantity":5},{"type":"Roses","color":"Orange","quantity":6},{"type":"Hypericum","color":"Red","quantity":4}]', 
   'system@admin.com'),
  
  ('R010', 'Petite Posy', 
   '[{"type":"Spray Roses","color":"Pink","quantity":10},{"type":"Carnations","color":"White","quantity":5},{"type":"Baby''s Breath","color":"White","quantity":3}]', 
   'system@admin.com');

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE produced_bunches ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to read and write)
-- Inventory policies
CREATE POLICY "Allow authenticated users to view inventory" 
  ON inventory FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert inventory" 
  ON inventory FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update inventory" 
  ON inventory FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete inventory" 
  ON inventory FOR DELETE 
  TO authenticated 
  USING (true);

-- Production lines policies
CREATE POLICY "Allow authenticated users to view production lines" 
  ON production_lines FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to update production lines" 
  ON production_lines FOR UPDATE 
  TO authenticated 
  USING (true);

-- Recipes policies
CREATE POLICY "Allow authenticated users to view recipes" 
  ON recipes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert recipes" 
  ON recipes FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update recipes" 
  ON recipes FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete recipes" 
  ON recipes FOR DELETE 
  TO authenticated 
  USING (true);

-- Production line items policies
CREATE POLICY "Allow authenticated users to view line items" 
  ON production_line_items FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert line items" 
  ON production_line_items FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete line items" 
  ON production_line_items FOR DELETE 
  TO authenticated 
  USING (true);

-- Produced bunches policies
CREATE POLICY "Allow authenticated users to view produced bunches" 
  ON produced_bunches FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert produced bunches" 
  ON produced_bunches FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Activity log policies
CREATE POLICY "Allow authenticated users to view activity log" 
  ON activity_log FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert activity log" 
  ON activity_log FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_inventory_box_id ON inventory(box_id);
CREATE INDEX idx_inventory_location ON inventory(location);
CREATE INDEX idx_production_line_items_line_id ON production_line_items(line_id);
CREATE INDEX idx_produced_bunches_line_id ON produced_bunches(line_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update timestamps
CREATE TRIGGER update_inventory_timestamp
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

CREATE TRIGGER update_production_lines_timestamp
  BEFORE UPDATE ON production_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

CREATE TRIGGER update_recipes_timestamp
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();
