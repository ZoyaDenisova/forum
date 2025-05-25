package repo

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"context"
	"fmt"
	"github.com/ZoyaDenisova/go-common/postgres"
	"github.com/jackc/pgx/v5"
)

type UserRepoPostgres struct {
	*postgres.Postgres
}

func NewUserRepo(pg *postgres.Postgres) *UserRepoPostgres {
	return &UserRepoPostgres{pg}
}

// Create сохраняет нового пользователя.
func (r *UserRepoPostgres) Create(ctx context.Context, u *entity.User) error {
	const query = `
        INSERT INTO users (name, email, password_hash, role, is_blocked, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `
	return r.Pool.QueryRow(ctx, query,
		u.Name, u.Email, u.PasswordHash, u.Role, u.IsBlocked, u.CreatedAt).
		Scan(&u.ID)
}

// Update изменяет всё, включая флаг блокировки.
func (r *UserRepoPostgres) Update(ctx context.Context, u *entity.User) error {
	const query = `
        UPDATE users
        SET name = $1,
            email = $2,
            password_hash = $3,
            role = $4,
            is_blocked = $5
        WHERE id = $6
    `
	cmd, err := r.Pool.Exec(ctx, query,
		u.Name, u.Email, u.PasswordHash, u.Role, u.IsBlocked, u.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.ErrNotFound
	}
	return nil
}

// scanUser – единое место, чтобы не дублировать Scan в выборках.
func scanUser(row pgx.Row, u *entity.User) error {
	return row.Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.IsBlocked,
		&u.CreatedAt,
	)
}

func (r *UserRepoPostgres) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	const op = "UserRepo.GetByID"
	const query = `
        SELECT id, name, email, password_hash, role, is_blocked, created_at
        FROM users
        WHERE id = $1
    `
	var u entity.User
	if err := scanUser(r.Pool.QueryRow(ctx, query, id), &u); err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return &u, nil
}

func (r *UserRepoPostgres) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	const op = "UserRepo.GetByEmail"
	const query = `
        SELECT id, name, email, password_hash, role, is_blocked, created_at
        FROM users
        WHERE email = $1
    `
	var u entity.User
	if err := scanUser(r.Pool.QueryRow(ctx, query, email), &u); err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return &u, nil
}

func (r *UserRepoPostgres) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	const op = "UserRepo.GetByUsername"
	const query = `
        SELECT id, name, email, password_hash, role, is_blocked, created_at
        FROM users
        WHERE name = $1
    `
	var u entity.User
	if err := scanUser(r.Pool.QueryRow(ctx, query, username), &u); err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: scan: %w", op, err)
	}
	return &u, nil
}

func (r *UserRepoPostgres) GetAll(ctx context.Context) ([]*entity.User, error) {
	const query = `
		SELECT id, name, email, password_hash, role, is_blocked, created_at
		FROM users
		ORDER BY id
	`

	rows, err := r.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("UserRepo.GetAll: query: %w", err)
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		var u entity.User
		if err := scanUser(rows, &u); err != nil {
			return nil, fmt.Errorf("UserRepo.GetAll: scan: %w", err)
		}
		users = append(users, &u)
	}
	return users, nil
}

func (r *UserRepoPostgres) Unblock(ctx context.Context, id int64) error {
	const op = "UserRepo.block"
	const query = `UPDATE users SET is_blocked = $1 WHERE id = $2`

	tag, err := r.Pool.Exec(ctx, query, false, id)
	if err != nil {
		return fmt.Errorf("%s: exec: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *UserRepoPostgres) Block(ctx context.Context, id int64) error {
	const op = "UserRepo.block"
	const query = `UPDATE users SET is_blocked = $1 WHERE id = $2`

	tag, err := r.Pool.Exec(ctx, query, true, id)
	if err != nil {
		return fmt.Errorf("%s: exec: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}
