CREATE TABLE IF NOT EXISTS users
(
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(16)  NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE IF NOT EXISTS categories
(
    id   SERIAL PRIMARY KEY,
    title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics
(
    id          SERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories (id) ON DELETE CASCADE,
    title       VARCHAR(512) NOT NULL,
    author_id   INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS messages
(
    id         SERIAL PRIMARY KEY,
    topic_id   INTEGER NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    created_at TIMESTAMP NOT NULL
);