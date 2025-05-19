package usecase

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"auth-service/internal/repo"
	"github.com/ZoyaDenisova/go-common/jwt"

	"context"
	"fmt"
	"time"
)

type SessionUsecase struct {
	sessionRepo repo.SessionRepo
	userRepo    repo.UserRepo
	tokens      jwt.TokenManager
}

func NewSessionUsecase(
	sessionRepo repo.SessionRepo,
	userRepo repo.UserRepo,
	tokens jwt.TokenManager,
) *SessionUsecase {
	return &SessionUsecase{
		sessionRepo: sessionRepo,
		userRepo:    userRepo,
		tokens:      tokens,
	}
}

// Refresh invalidates old token and issues a new pair.
func (uc *SessionUsecase) Refresh(ctx context.Context, oldToken string) (string, string, error) {
	// 1) проверить подпись и срок JWT
	userID, role, err := uc.tokens.ValidateRefresh(oldToken)
	if err != nil {
		return "", "", fmt.Errorf("session.Refresh - validate token: %w", err)
	}

	// 2) проверить, что сессия есть в БД
	sess, err := uc.sessionRepo.GetByToken(ctx, oldToken)
	if err != nil {
		return "", "", fmt.Errorf("session.Refresh - validate token: %w", err)
	}
	if sess.UserID != userID {
		return "", "", fmt.Errorf("session.Refresh - validate token: %w", err)
	}
	// 3) Проверка истечения сессии
	if time.Now().After(sess.ExpiresAt) {
		return "", "", errors.ErrExpiredToken
	}
	// 4) удалить старую
	if err := uc.sessionRepo.DeleteByToken(ctx, oldToken); err != nil {
		return "", "", fmt.Errorf("session.Refresh - delete old session: %w", err)
	}

	// 5) сгенерить новую пару
	tokens, err := uc.tokens.Generate(userID, role)
	if err != nil {
		return "", "", fmt.Errorf("session.Refresh - token gen: %w", err)
	}

	// 6) сохранить новую сессию
	now := time.Now().UTC()
	newSession := &entity.Session{
		UserID:       userID,
		RefreshToken: tokens.RefreshToken,
		CreatedAt:    now,
		ExpiresAt:    tokens.RefreshExpires,
	}

	if err := uc.sessionRepo.Save(ctx, newSession); err != nil {
		return "", "", fmt.Errorf("session.Refresh - save session: %w", err)
	}

	return tokens.AccessToken, tokens.RefreshToken, nil
}

func (uc *SessionUsecase) List(ctx context.Context, userID int64) ([]entity.Session, error) {
	sessions, err := uc.sessionRepo.ListActiveByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("session.List - get active sessions: %w", err)
	}
	if len(sessions) == 0 {
		return nil, errors.ErrNotFound
	}

	return sessions, nil
}

// Revoke deletes a session by token.
func (uc *SessionUsecase) Revoke(ctx context.Context, token string) error {
	if err := uc.sessionRepo.DeleteByToken(ctx, token); err != nil {
		return fmt.Errorf("session.Revoke - delete by token: %w", err)
	}
	return nil
}

// RevokeAll removes all user sessions.
func (uc *SessionUsecase) RevokeAll(ctx context.Context, userID int64) error {
	if err := uc.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
		return fmt.Errorf("session.RevokeAll - delete by userID: %w", err)
	}
	return nil
}

func (uc *SessionUsecase) DeleteExpired(ctx context.Context) error {
	const op = "sessionUsecase.DeleteExpired"

	// Проверка отмены или дедлайна
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("%s: context error: %w", op, err)
	}

	// Вызов repo
	if err := uc.sessionRepo.DeleteExpired(ctx); err != nil {
		return fmt.Errorf("%s: failed to delete expired sessions: %w", op, err)
	}

	return nil
}
