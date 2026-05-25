-- 1. TABLE YA CONFIG - ON/OFF + SCOPE + DELAY
CREATE TABLE IF NOT EXISTS autoread_config (
  id TEXT PRIMARY KEY DEFAULT 'config',
  is_enabled BOOLEAN DEFAULT true,
  autoread_scope TEXT DEFAULT 'all', -- all, groups, dm
  delay_min_ms INTEGER DEFAULT 1000,
  delay_max_ms INTEGER DEFAULT 3000,
  mark_chat_read BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO autoread_config (id, is_enabled, autoread_scope, delay_min_ms, delay_max_ms, mark_chat_read)
VALUES ('config', true, 'all', 1000, 3000, true)
ON CONFLICT (id) DO UPDATE SET
  is_enabled = true,
  updated_at = NOW();

-- 2. TABLE YA LOGS - KILA MESSAGE INAYOSOMEKA
CREATE TABLE IF NOT EXISTS autoread_logs (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT,
  chat_jid TEXT NOT NULL,
  sender_jid TEXT,
  sender_name TEXT,
  is_group BOOLEAN DEFAULT false,
  message_type TEXT,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autoread_logs_chat ON autoread_logs(chat_jid);
CREATE INDEX IF NOT EXISTS idx_autoread_logs_time ON autoread_logs(read_at DESC);

-- 3. WHITELIST - CHATS ZA KUSOMA TU
CREATE TABLE IF NOT EXISTS autoread_whitelist (
  chat_jid TEXT PRIMARY KEY,
  chat_name TEXT,
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BLACKLIST - CHATS ZA KUTOKUSOMA
CREATE TABLE IF NOT EXISTS autoread_blacklist (
  chat_jid TEXT PRIMARY KEY,
  chat_name TEXT,
  reason TEXT,
  blocked_by TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STATS - COUNT ZA KILA CHAT
CREATE TABLE IF NOT EXISTS autoread_stats (
  chat_jid TEXT PRIMARY KEY,
  chat_name TEXT,
  total_read BIGINT DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FUNCTION AUTO DELETE LOGS 24HRS
CREATE OR REPLACE FUNCTION delete_old_autoread_logs() RETURNS void AS $$
BEGIN
  DELETE FROM autoread_logs
  WHERE read_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER AUTO UPDATE STATS
CREATE OR REPLACE FUNCTION update_autoread_stats() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO autoread_stats (chat_jid, chat_name, total_read, last_read_at, updated_at)
  VALUES (NEW.chat_jid, NEW.sender_name, 1, NOW(), NOW())
  ON CONFLICT (chat_jid) DO UPDATE SET
    total_read = autoread_stats.total_read + 1,
    last_read_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_autoread_stats ON autoread_logs;
CREATE TRIGGER trigger_update_autoread_stats
  AFTER INSERT ON autoread_logs
  FOR EACH ROW EXECUTE FUNCTION update_autoread_stats();

-- 8. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE autoread_config;
ALTER PUBLICATION supabase_realtime ADD TABLE autoread_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE autoread_whitelist;
ALTER PUBLICATION supabase_realtime ADD TABLE autoread_blacklist;
ALTER PUBLICATION supabase_realtime ADD TABLE autoread_stats;