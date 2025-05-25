package repo

import (
	"chat-service/internal/entity"
	"chat-service/internal/errors"
	"context"
	"fmt"
	"github.com/ZoyaDenisova/go-common/postgres"
	"github.com/jackc/pgx/v5"
)

type TopicRepoPostgres struct {
	*postgres.Postgres
}

func NewTopicRepo(pg *postgres.Postgres) TopicRepository {
	return &TopicRepoPostgres{pg}
}

func (r *TopicRepoPostgres) Create(ctx context.Context, t *entity.Topic) (int64, error) {
	const op = "TopicRepo.Create"
	const query = `
        INSERT INTO topics (category_id, title, description, author_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id,
    `

	var id int64
	err := r.Pool.QueryRow(ctx, query, t.CategoryID, t.Title, t.Description, t.AuthorID, t.CreatedAt).
		Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", op, err)
	}
	return id, nil
}

func (r *TopicRepoPostgres) Update(ctx context.Context, t *entity.Topic) (int64, error) {
	const op = "TopicRepo.Update"
	const query = `
        UPDATE topics
           SET category_id = $2,
               title       = $3,
               description = $4
         WHERE id = $1
         RETURNING id;
    `

	var id int64
	err := r.Pool.
		QueryRow(ctx, query,
			t.ID, t.CategoryID, t.Title, t.Description,
		).
		Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return 0, fmt.Errorf("%s: %w", op, err)
	}

	return id, nil
}

func (r *TopicRepoPostgres) Delete(ctx context.Context, id int64) error {
	const op = "TopicRepo.Delete"
	const query = `DELETE FROM topics WHERE id = $1;`

	tag, err := r.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *TopicRepoPostgres) GetByCategory(ctx context.Context, categoryID int64) ([]*entity.Topic, error) {
	const op = "TopicRepo.GetByCategory"
	const query = `
        SELECT t.id, t.category_id, t.title, t.description,
       	t.author_id, u.name AS author_name,   
       	t.created_at
		FROM   topics t
		JOIN   users u ON u.id = t.author_id           
		WHERE  t.category_id = $1
		ORDER  BY t.created_at;

    `

	rows, err := r.Pool.Query(ctx, query, categoryID)
	if err != nil {
		return nil, fmt.Errorf("%s: query: %w", op, err)
	}
	defer rows.Close()

	var list []*entity.Topic
	for rows.Next() {
		t := &entity.Topic{}
		if err := rows.Scan(&t.ID, &t.CategoryID, &t.Title, &t.Description,
			&t.AuthorID, &t.AuthorName, // +1
			&t.CreatedAt); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", op, err)
		}
		list = append(list, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: rows: %w", op, err)
	}
	return list, nil
}

func (r *TopicRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.Topic, error) {
	const op = "TopicRepo.GetByID"
	const query = `
    	SELECT t.id, t.category_id, t.title, t.description,
       	t.author_id, u.name AS author_name,
       	t.created_at
		FROM   topics t
		JOIN   users u ON u.id = t.author_id
		WHERE  t.id = $1;
    `

	t := &entity.Topic{}
	err := r.Pool.QueryRow(ctx, query, id).
		Scan(&t.ID, &t.CategoryID, &t.Title, &t.Description,
			&t.AuthorID, &t.AuthorName, // +1
			&t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return t, nil
}
