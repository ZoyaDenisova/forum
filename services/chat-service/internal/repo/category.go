package repo

import (
	"context"
	"fmt"

	"chat-service/internal/entity"
	"chat-service/internal/errors"
	"github.com/ZoyaDenisova/go-common/postgres"
	"github.com/jackc/pgx/v5"
)

type CategoryRepoPostgres struct {
	*postgres.Postgres
}

func NewCategoryRepo(pg *postgres.Postgres) CategoryRepository {
	return &CategoryRepoPostgres{pg}
}

func (r *CategoryRepoPostgres) Create(ctx context.Context, c *entity.Category) error {
	const op = "CategoryRepo.Create"
	const query = `
        INSERT INTO categories (title, description)
        VALUES ($1, $2)
        RETURNING id;
    `
	if err := r.Pool.
		QueryRow(ctx, query, c.Title, c.Description).
		Scan(&c.ID); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (r *CategoryRepoPostgres) Update(ctx context.Context, c *entity.Category) error {
	const op = "CategoryRepo.Update"
	const query = `
        UPDATE categories
           SET title       = $2,
               description = $3
         WHERE id = $1;
    `
	tag, err := r.Pool.Exec(ctx, query, c.ID, c.Title, c.Description)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *CategoryRepoPostgres) Delete(ctx context.Context, id int64) error {
	const op = "CategoryRepo.Delete"
	const query = `DELETE FROM categories WHERE id = $1;`

	tag, err := r.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *CategoryRepoPostgres) GetAll(ctx context.Context) ([]*entity.Category, error) {
	const op = "CategoryRepo.GetAll"
	const query = `
        SELECT id, title, description
        FROM categories
        ORDER BY title
    `

	rows, err := r.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("%s: query: %w", op, err)
	}
	defer rows.Close()

	var list []*entity.Category
	for rows.Next() {
		c := &entity.Category{}
		if err := rows.Scan(&c.ID, &c.Title, &c.Description); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", op, err)
		}
		list = append(list, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: rows: %w", op, err)
	}
	return list, nil
}

func (r *CategoryRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.Category, error) {
	const op = "CategoryRepo.GetByID"
	const query = `
        SELECT id, title, description
        FROM categories
        WHERE id = $1
    `

	c := &entity.Category{}
	err := r.Pool.QueryRow(ctx, query, id).
		Scan(&c.ID, &c.Title, &c.Description)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return c, nil
}
