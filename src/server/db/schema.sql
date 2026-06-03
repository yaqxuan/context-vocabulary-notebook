PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Word sense cards: one target word + one concrete contextual meaning
CREATE TABLE IF NOT EXISTS word_sense_cards (
  id                  TEXT PRIMARY KEY,
  target_word         TEXT NOT NULL,
  context_meaning     TEXT NOT NULL,
  target_language     TEXT NOT NULL DEFAULT '英语',
  definition_language TEXT NOT NULL DEFAULT '中文',
  status              TEXT NOT NULL DEFAULT 'reviewing' CHECK (status IN ('reviewing', 'mastered')),
  is_favorite         INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT
);

CREATE INDEX IF NOT EXISTS idx_cards_status        ON word_sense_cards (status)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cards_is_favorite   ON word_sense_cards (is_favorite) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cards_deleted_at    ON word_sense_cards (deleted_at);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at    ON word_sense_cards (updated_at DESC);

-- Context examples: one card can have many context examples
CREATE TABLE IF NOT EXISTS context_examples (
  id         TEXT PRIMARY KEY,
  card_id    TEXT NOT NULL REFERENCES word_sense_cards (id),
  sentence   TEXT NOT NULL,
  note       TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ctx_card_id         ON context_examples (card_id);
CREATE INDEX IF NOT EXISTS idx_ctx_card_sort       ON context_examples (card_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ctx_deleted_at      ON context_examples (deleted_at);

-- Media files: video/image/audio attached to context examples
CREATE TABLE IF NOT EXISTS media_files (
  id                  TEXT PRIMARY KEY,
  context_example_id  TEXT NOT NULL REFERENCES context_examples (id),
  media_type          TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'audio')),
  file_name           TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           INTEGER NOT NULL DEFAULT 0,
  is_available        INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  created_at          TEXT NOT NULL,
  deleted_at          TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_context_id    ON media_files (context_example_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_deleted_at    ON media_files (deleted_at);

-- Tags: free classification and source marking
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Tag name uniqueness among non-deleted tags enforced via unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_active ON tags (name) WHERE deleted_at IS NULL;

-- Card-tag relationships (no separate soft delete; follows card and tag deleted_at)
CREATE TABLE IF NOT EXISTS card_tags (
  card_id    TEXT NOT NULL REFERENCES word_sense_cards (id),
  tag_id     TEXT NOT NULL REFERENCES tags (id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (card_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id    ON card_tags (tag_id);

-- FSRS states: one-to-one with word_sense_cards
CREATE TABLE IF NOT EXISTS fsrs_states (
  id               TEXT PRIMARY KEY,
  card_id          TEXT NOT NULL UNIQUE REFERENCES word_sense_cards (id),
  due_date         TEXT NOT NULL,
  stability        REAL,
  difficulty       REAL,
  elapsed_days     INTEGER NOT NULL DEFAULT 0,
  scheduled_days   INTEGER NOT NULL DEFAULT 0,
  learning_steps   INTEGER NOT NULL DEFAULT 0,
  reps             INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  state            INTEGER NOT NULL DEFAULT 0 CHECK (state IN (0, 1, 2, 3)),
  last_reviewed_at TEXT,
  same_day_retry_at TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fsrs_due_date       ON fsrs_states (due_date);
CREATE INDEX IF NOT EXISTS idx_fsrs_card_id        ON fsrs_states (card_id);

-- Review logs: permanent record; not cascade-deleted with cards
CREATE TABLE IF NOT EXISTS review_logs (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES word_sense_cards (id),
  rating          TEXT NOT NULL CHECK (rating IN ('again', 'good')),
  reviewed_at     TEXT NOT NULL,
  due_date_before TEXT NOT NULL,
  due_date_after  TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_card_id     ON review_logs (card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs (reviewed_at);

-- User settings: singleton row with id=1
CREATE TABLE IF NOT EXISTS user_settings (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  interface_language        TEXT NOT NULL DEFAULT 'zh-CN',
  default_target_language   TEXT NOT NULL DEFAULT '英语',
  default_definition_language TEXT NOT NULL DEFAULT '中文',
  daily_review_limit        INTEGER NOT NULL DEFAULT 20,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL
);

-- AI configs: OpenAI-compatible local API settings for V2 card suggestions
CREATE TABLE IF NOT EXISTS ai_configs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  base_url   TEXT NOT NULL,
  -- Local secret storage; API responses and exports must redact this value.
  api_key    TEXT NOT NULL,
  model      TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_configs (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_configs_deleted_at ON ai_configs (deleted_at);
