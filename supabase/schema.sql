-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drops table - stores user's saved drops
CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  haul_id TEXT NOT NULL,
  products JSONB NOT NULL,
  outfitIdeas JSONB,
  outfits JSONB,
  queries TEXT[],
  profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  CONSTRAINT unique_user_haul UNIQUE(user_id, haul_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_share_token ON drops(share_token);
CREATE INDEX IF NOT EXISTS idx_drops_created_at ON drops(created_at DESC);

-- User preferences table (for future use)
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
  product_id TEXT NOT NULL,
  product_url TEXT NOT NULL,
  current_price DECIMAL(10, 2),
  target_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_tracking_user_id ON price_tracking(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (use DROP IF EXISTS to avoid errors on re-run)
DROP TRIGGER IF EXISTS update_drops_updated_at ON drops;
CREATE TRIGGER update_drops_updated_at BEFORE UPDATE ON drops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_price_tracking_updated_at ON price_tracking;
CREATE TRIGGER update_price_tracking_updated_at BEFORE UPDATE ON price_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own drops
CREATE POLICY "Users can view their own drops"
  ON drops FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own drops
CREATE POLICY "Users can insert their own drops"
  ON drops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own drops
CREATE POLICY "Users can update their own drops"
  ON drops FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own drops
CREATE POLICY "Users can delete their own drops"
  ON drops FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anonymous drops can be viewed by anyone with share_token
CREATE POLICY "Anonymous drops are viewable with share token"
  ON drops FOR SELECT
  USING (is_anonymous = TRUE AND share_token IS NOT NULL);

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own price tracking
CREATE POLICY "Users can view their own price tracking"
  ON price_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own price tracking
CREATE POLICY "Users can insert their own price tracking"
  ON price_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own price tracking
CREATE POLICY "Users can update their own price tracking"
  ON price_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own price tracking
CREATE POLICY "Users can delete their own price tracking"
  ON price_tracking FOR DELETE
  USING (auth.uid() = user_id);
