-- Add missing columns to leads table
ALTER TABLE leads ADD COLUMN company TEXT;
ALTER TABLE leads ADD COLUMN phone TEXT;
ALTER TABLE leads ADD COLUMN service_interest TEXT;
ALTER TABLE leads ADD COLUMN message TEXT;
ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create the tables that don't exist yet
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  status TEXT,
  amount INTEGER,
  razorpay_subscription_id TEXT,
  started_at DATETIME,
  cancelled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT,
  client_email TEXT,
  service TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  opened INTEGER DEFAULT 0,
  reviewed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS content_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  title TEXT,
  body TEXT,
  link TEXT,
  scheduled_for DATETIME,
  published INTEGER DEFAULT 0,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
