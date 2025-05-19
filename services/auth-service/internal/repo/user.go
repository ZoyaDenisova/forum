package repo

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"context"
	"fmt"
	"github.com/ZoyaDenisova/go-common/postgres"
	"github.com/jackc/pgx/v5"
)

// TODO время задавать в юскейсах
// todo хранить роль в JWT-токене: При генерации access-токена добавлять поле role, чтобы фронт и backend могли делать проверки без запроса к БД
type UserRepoPostgres struct {
	*postgres.Postgres
}

func NewUserRepo(pg *postgres.Postgres) *UserRepoPostgres {
	return &UserRepoPostgres{pg}
}

func (r *UserRepoPostgres) Create(ctx context.Context, u *entity.User) error {
	query := `
		INSERT INTO users (name, email, password_hash, role, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	return r.Pool.QueryRow(ctx, query, u.Name, u.Email, u.PasswordHash, u.Role, u.CreatedAt).Scan(&u.ID)
}

func (r *UserRepoPostgres) Update(ctx context.Context, u *entity.User) error {
	query := `
		UPDATE users
		SET name = $1, email = $2, password_hash = $3, role = $4
		WHERE id = $5
	`
	cmd, err := r.Pool.Exec(ctx, query, u.Name, u.Email, u.PasswordHash, u.Role, u.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.ErrNotFound
	}
	return nil
}

func (r *UserRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	const op = "UserRepo.GetByID"

	query := `
		SELECT id, name, email, password_hash, role, created_at
		FROM users
		WHERE id = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt,
	)
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
		SELECT id, name, email, password_hash, role, created_at
		FROM users
		WHERE email = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt,
	)
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
		SELECT id, name, email, password_hash, role, created_at
		FROM users
		WHERE name = $1
	`

	var u entity.User
	err := r.Pool.QueryRow(ctx, query, username).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt,
	)
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

	query := `DELETE FROM users WHERE id = $1`

	tag, err := r.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: exec: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}
