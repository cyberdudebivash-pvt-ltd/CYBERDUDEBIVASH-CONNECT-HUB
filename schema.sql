CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  service_interest TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
