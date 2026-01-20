-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table - stores all products (reusable across outfits)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE, -- ID from Channel3 or other external source
  name TEXT NOT NULL,
  brand TEXT,
  image TEXT,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  buy_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Outfits table - stores outfit metadata
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occasion TEXT,
  stylist_blurb TEXT,
  total_price DECIMAL(10, 2),
  price_range_min DECIMAL(10, 2),
  price_range_max DECIMAL(10, 2),
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_created_at ON outfits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outfits_share_token ON outfits(share_token);

-- Outfit items - links outfits to products with metadata
CREATE TABLE IF NOT EXISTS outfit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- top, bottom, shoes, bag, etc.
  reasoning TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL, -- Order within the outfit (0, 1, 2, 3...)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(outfit_id, position) -- Ensure unique positions per outfit
);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_product_id ON outfit_items(product_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_category ON outfit_items(category);

-- Product variants - alternative products for each outfit item
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_item_id UUID NOT NULL REFERENCES outfit_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- Order of variants (0 = primary, 1+ = alternatives)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(outfit_item_id, position)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_outfit_item_id ON product_variants(outfit_item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Styling sessions - groups outfits generated together (replaces "drops")
CREATE TABLE IF NOT EXISTS styling_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_data JSONB, -- Store quiz/profile data for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_styling_sessions_user_id ON styling_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_styling_sessions_created_at ON styling_sessions(created_at DESC);

-- Link outfits to styling sessions
CREATE TABLE IF NOT EXISTS session_outfits (
  session_id UUID NOT NULL REFERENCES styling_sessions(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- Order within the session
  PRIMARY KEY (session_id, outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_session_outfits_session_id ON session_outfits(session_id);
CREATE INDEX IF NOT EXISTS idx_session_outfits_outfit_id ON session_outfits(outfit_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price tracking table (for premium feature)
CREATE TABLE IF NOT EXISTS price_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_price DECIMAL(10, 2),
  target_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_tracking_user_id ON price_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_product_id ON price_tracking(product_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_outfits_updated_at ON outfits;
CREATE TRIGGER update_outfits_updated_at BEFORE UPDATE ON outfits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_styling_sessions_updated_at ON styling_sessions;
CREATE TRIGGER update_styling_sessions_updated_at BEFORE UPDATE ON styling_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_price_tracking_updated_at ON price_tracking;
CREATE TRIGGER update_price_tracking_updated_at BEFORE UPDATE ON price_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE styling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;

-- Products: Anyone can read (for shared outfits), authenticated users can insert/update
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products can be inserted by authenticated users" ON products;
DROP POLICY IF EXISTS "Products can be updated by authenticated users" ON products;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Products can be inserted by authenticated users"
  ON products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Products can be updated by authenticated users"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Outfits: Users can manage their own
CREATE POLICY "Users can view their own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- Shared outfits (via share_token)
CREATE POLICY "Shared outfits are viewable with token"
  ON outfits FOR SELECT
  USING (share_token IS NOT NULL);

-- Outfit items: Inherit from outfits
CREATE POLICY "Outfit items follow outfit permissions"
  ON outfit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outfits 
      WHERE outfits.id = outfit_items.outfit_id 
      AND (outfits.user_id = auth.uid() OR outfits.share_token IS NOT NULL)
    )
  );

CREATE POLICY "Users can manage items in their outfits"
  ON outfit_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfits 
      WHERE outfits.id = outfit_items.outfit_id 
      AND outfits.user_id = auth.uid()
    )
  );

-- Product variants: Inherit from outfit items
CREATE POLICY "Product variants follow outfit item permissions"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outfit_items
      JOIN outfits ON outfits.id = outfit_items.outfit_id
      WHERE outfit_items.id = product_variants.outfit_item_id
      AND (outfits.user_id = auth.uid() OR outfits.share_token IS NOT NULL)
    )
  );

CREATE POLICY "Users can manage variants in their outfit items"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfit_items
      JOIN outfits ON outfits.id = outfit_items.outfit_id
      WHERE outfit_items.id = product_variants.outfit_item_id
      AND outfits.user_id = auth.uid()
    )
  );

-- Styling sessions: Users can manage their own
CREATE POLICY "Users can view their own styling sessions"
  ON styling_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own styling sessions"
  ON styling_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own styling sessions"
  ON styling_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own styling sessions"
  ON styling_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Session outfits: Inherit from sessions
CREATE POLICY "Session outfits follow session permissions"
  ON session_outfits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM styling_sessions
      WHERE styling_sessions.id = session_outfits.session_id
      AND styling_sessions.user_id = auth.uid()
    )
  );

-- User preferences: Users can manage their own
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price tracking: Users can manage their own
CREATE POLICY "Users can view their own price tracking"
  ON price_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price tracking"
  ON price_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price tracking"
  ON price_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price tracking"
  ON price_tracking FOR DELETE
  USING (auth.uid() = user_id);
