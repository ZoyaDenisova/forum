package repo

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"auth-service/pkg/postgres"
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

// TODO проверить чтобы время задавалось в самой бд а не тут
type UserRepoPostgres struct {
	*postgres.Postgres
}

func NewUserRepo(pg *postgres.Postgres) *UserRepoPostgres {
	return &UserRepoPostgres{pg}
}

func (r *UserRepoPostgres) Save(ctx context.Context, u *entity.User) error {
	const op = "UserRepo.Save"

	query := `
		INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			email = EXCLUDED.email,
			password_hash = EXCLUDED.password_hash,
			updated_at = NOW()
	`

	ct, err := r.Pool.Exec(ctx, query, u.ID, u.Name, u.Email, u.PasswordHash, u.CreatedAt, u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("%s: exec: %w", op, err)
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrConflict)
	}
	return nil
}

func (r *UserRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	const op = "UserRepo.GetByID"

	query := `
		SELECT id, name, email, password_hash, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, id).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}

	return &u, nil
}

func (r *UserRepoPostgres) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	const op = "UserRepo.GetByEmail"

	query := `
		SELECT id, name, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, email).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}

	return &u, nil
}

func (r *UserRepoPostgres) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	const op = "UserRepo.GetByUsername"

	query := `
		SELECT id, name, email, password_hash, created_at, updated_at
		FROM users
		WHERE name = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, username).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}

	return &u, nil
}

func (r *UserRepoPostgres) Delete(ctx context.Context, id int64) error {
	const op = "UserRepo.Delete"

	query := `
		DELETE FROM users
		WHERE id = $1
	`

	tag, err := r.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: exec: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}
