package repo

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"context"
	"fmt"
	"github.com/ZoyaDenisova/go-common/postgres"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type SessionRepoPostgres struct {
	*postgres.Postgres
}

func NewSessionRepo(pg *postgres.Postgres) *SessionRepoPostgres {
	return &SessionRepoPostgres{pg}
}

func (r *SessionRepoPostgres) Save(ctx context.Context, s *entity.Session) error {
	const op = "SessionRepo.Save"

	query := `
		INSERT INTO sessions
			(user_id, refresh_token, user_agent, expires_at, created_at)
		VALUES
			($1, $2, $3, $4, NOW())
		ON CONFLICT (refresh_token) DO UPDATE SET
			user_agent = EXCLUDED.user_agent,
			expires_at = EXCLUDED.expires_at
		RETURNING id, created_at;
	`

	err := r.Pool.
		QueryRow(ctx, query, s.UserID, s.RefreshToken, s.UserAgent, s.ExpiresAt).
		Scan(&s.ID, &s.CreatedAt)
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

	query := `
		SELECT id, user_id, refresh_token, user_agent,
		       created_at, expires_at
		FROM   sessions
		WHERE  refresh_token = $1;
	`

	var s entity.Session
	err := r.Pool.QueryRow(ctx, query, token).
		Scan(&s.ID, &s.UserID, &s.RefreshToken, &s.UserAgent,
			&s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("%s: %w", op, errors.ErrNotFound)
		}
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return &s, nil
}

func (r *SessionRepoPostgres) ListActiveByUser(ctx context.Context, userID int64) ([]entity.Session, error) {
	const op = "SessionRepo.ListActiveByUser"

	query := `
		SELECT id, user_id, refresh_token, user_agent, created_at, expires_at
		FROM sessions
		WHERE user_id = $1 AND expires_at > NOW()
	`

	rows, err := r.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("%s: query: %w", op, err)
	}
	defer rows.Close()

	var sessions []entity.Session
	for rows.Next() {
		var s entity.Session
		if err := rows.Scan(
			&s.ID,
			&s.UserID,
			&s.RefreshToken,
			&s.UserAgent,
			&s.CreatedAt,
			&s.ExpiresAt,
		); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", op, err)
		}
		sessions = append(sessions, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: rows: %w", op, err)
	}

	return sessions, nil
}

func (r *SessionRepoPostgres) DeleteByToken(ctx context.Context, token string) error {
	const op = "SessionRepo.DeleteByToken"

	query := `DELETE FROM sessions WHERE refresh_token = $1;`

	tag, err := r.Pool.Exec(ctx, query, token)
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

	query := `DELETE FROM sessions WHERE user_id = $1;`

	if _, err := r.Pool.Exec(ctx, query, userID); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (r *SessionRepoPostgres) DeleteExpired(ctx context.Context) error {
	const op = "SessionRepo.DeleteExpired"

	query := `DELETE FROM sessions WHERE expires_at < NOW();`

	if _, err := r.Pool.Exec(ctx, query); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}
