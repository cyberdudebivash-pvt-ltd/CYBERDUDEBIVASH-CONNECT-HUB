-- paste schema here
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
