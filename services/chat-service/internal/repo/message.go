package repo

import (
	"chat-service/internal/errors"
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"time"

	"chat-service/internal/entity"
	"github.com/ZoyaDenisova/go-common/postgres"
)

type MessageRepoPostgres struct {
	*postgres.Postgres
}

func NewMessageRepo(pg *postgres.Postgres) MessageRepository {
	return &MessageRepoPostgres{pg}
}

func (r *MessageRepoPostgres) Create(ctx context.Context, m *entity.Message) error {
	const op = "MessageRepo.Create"
	const query = `
        INSERT INTO messages (topic_id, author_id, content, created_at)
	    VALUES ($1, $2, $3, $4)
	    RETURNING id,
	              (SELECT name FROM users WHERE id = $2) AS author_name;
    `

	if err := r.Pool.QueryRow(ctx, query,
		m.TopicID, m.AuthorID, m.Content, m.CreatedAt,
	).Scan(&m.ID, &m.AuthorName); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (r *MessageRepoPostgres) Update(ctx context.Context, id int64, newContent string) error {
	const op = "MessageRepo.Update"
	const query = `
        UPDATE messages
        SET content = $2
        WHERE id = $1
    `

	tag, err := r.Pool.Exec(ctx, query, id, newContent)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *MessageRepoPostgres) Delete(ctx context.Context, id int64) error {
	const op = "MessageRepo.Delete"
	const query = `DELETE FROM messages WHERE id = $1`

	tag, err := r.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *MessageRepoPostgres) GetByTopic(ctx context.Context, topicID int64) ([]*entity.Message, error) {
	const op = "MessageRepo.GetByTopic"
	const query = `
        SELECT m.id, m.topic_id, m.author_id, u.name AS author_name, m.content, m.created_at
        FROM messages m
        JOIN users u ON u.id = m.author_id
        WHERE m.topic_id = $1
        ORDER BY m.created_at
    `

	rows, err := r.Pool.Query(ctx, query, topicID)
	if err != nil {
		return nil, fmt.Errorf("%s: query: %w", op, err)
	}
	defer rows.Close()

	var list []*entity.Message
	for rows.Next() {
		m := &entity.Message{}
		if err := rows.Scan(&m.ID, &m.TopicID, &m.AuthorID, &m.AuthorName, &m.Content, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", op, err)
		}
		list = append(list, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: rows: %w", op, err)
	}
	return list, nil
}

func (r *MessageRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.Message, error) {
	const op = "MessageRepo.GetByID"
	const query = `
        SELECT m.id, m.topic_id, m.author_id, u.name AS author_name, m.content, m.created_at
        FROM messages m
        JOIN users u ON u.id = m.author_id
        WHERE m.id = $1
    `

	m := &entity.Message{}
	err := r.Pool.QueryRow(ctx, query, id).
		Scan(&m.ID, &m.TopicID, &m.AuthorID, &m.AuthorName, &m.Content, &m.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return m, nil
}

func (r *MessageRepoPostgres) DeleteOlderThan(ctx context.Context, threshold time.Time) error {
	const op = "MessageRepo.DeleteOlderThan"
	const query = `DELETE FROM messages WHERE created_at < $1`

	_, err := r.Pool.Exec(ctx, query, threshold)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}
