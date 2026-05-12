CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer')),
  full_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  mac_address TEXT UNIQUE NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE telemetry_logs (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  temperature FLOAT,
  humidity FLOAT,
  pressure FLOAT,
  voc_level FLOAT,
  ammonia_level FLOAT,
  health_score FLOAT,
  spoilage_risk TEXT CHECK (spoilage_risk IN ('low','medium','high','critical')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telemetry_device_time ON telemetry_logs(device_id, recorded_at DESC);

CREATE TABLE camera_snapshots (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  yolo_detections JSONB,
  visual_health_score FLOAT,
  mold_detected BOOLEAN DEFAULT FALSE,
  sprout_detected BOOLEAN DEFAULT FALSE,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id),
  produce_name TEXT NOT NULL,
  quantity_kg FLOAT NOT NULL,
  asking_price_per_kg FLOAT NOT NULL,
  description TEXT,
  health_score FLOAT,
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','negotiating','sold','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  offered_price_per_kg FLOAT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','countered')),
  counter_price FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  bid_id UUID REFERENCES bids(id),
  farmer_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  final_price_per_kg FLOAT NOT NULL,
  quantity_kg FLOAT NOT NULL,
  total_amount FLOAT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id),
  device_id UUID REFERENCES devices(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning','critical')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
