package repo

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"auth-service/pkg/postgres"
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"time"
)

type SessionRepoPostgres struct {
	*postgres.Postgres
}

func NewSessionRepo(pg *postgres.Postgres) *SessionRepoPostgres {
	return &SessionRepoPostgres{pg}
}

func (r *SessionRepoPostgres) Save(ctx context.Context, s *entity.Session) error {
	const op = "SessionRepo.Save"

	sql := `
		INSERT INTO sessions
			(user_id, refresh_token, user_agent, ip_address, expires_at, created_at)
		VALUES
			($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (refresh_token) DO UPDATE SET
			user_agent   = EXCLUDED.user_agent,
			ip_address   = EXCLUDED.ip_address,
			expires_at   = EXCLUDED.expires_at,
			last_used_at = NOW()
		RETURNING id, created_at, last_used_at;
	`

	err := r.Pool.
		QueryRow(ctx, sql, s.UserID, s.RefreshToken, s.UserAgent, s.IPAddress, s.ExpiresAt).
		Scan(&s.ID, &s.CreatedAt, &s.LastUsedAt)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			return fmt.Errorf("%s: %w", op, errors.ErrConflict)
		}
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (r *SessionRepoPostgres) GetByToken(ctx context.Context, token string) (*entity.Session, error) {
	const op = "SessionRepo.GetByToken"

	sql := `
		SELECT id, user_id, refresh_token, user_agent, ip_address,
		       created_at, expires_at, last_used_at
		FROM   sessions
		WHERE  refresh_token = $1;
	`

	var s entity.Session
	err := r.Pool.QueryRow(ctx, sql, token).
		Scan(&s.ID, &s.UserID, &s.RefreshToken, &s.UserAgent, &s.IPAddress,
			&s.CreatedAt, &s.ExpiresAt, &s.LastUsedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if time.Now().After(s.ExpiresAt) {
		return nil, fmt.Errorf("%s: %w", op, errors.ErrExpiredToken)
	}
	return &s, nil
}

func (r *SessionRepoPostgres) DeleteByToken(ctx context.Context, token string) error {
	const op = "SessionRepo.DeleteByToken"

	sql := `DELETE FROM sessions WHERE refresh_token = $1;`

	tag, err := r.Pool.Exec(ctx, sql, token)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *SessionRepoPostgres) DeleteByUserID(ctx context.Context, userID int64) error {
	const op = "SessionRepo.DeleteByUserID"

	sql := `DELETE FROM sessions WHERE user_id = $1;`

	if _, err := r.Pool.Exec(ctx, sql, userID); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (r *SessionRepoPostgres) UpdateLastUsed(ctx context.Context, token string) error {
	const op = "SessionRepo.UpdateLastUsed"

	sql := `UPDATE sessions SET last_used_at = NOW() WHERE refresh_token = $1;`

	tag, err := r.Pool.Exec(ctx, sql, token)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s: %w", op, errors.ErrNotFound)
	}
	return nil
}

func (r *SessionRepoPostgres) DeleteExpired(ctx context.Context) error {
	const op = "SessionRepo.DeleteExpired"

	sql := `DELETE FROM sessions WHERE expires_at < NOW();`

	if _, err := r.Pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}
