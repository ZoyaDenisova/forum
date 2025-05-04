CREATE TABLE IF NOT EXISTS sessions (
                                        id             SERIAL PRIMARY KEY,
                                        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token  VARCHAR(512) NOT NULL UNIQUE,
    user_agent     TEXT,
    ip_address     INET,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ NOT NULL,
    last_used_at   TIMESTAMPTZ
    );
