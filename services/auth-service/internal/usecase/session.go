package usecase

import (
	"auth-service/internal/entity"
	"auth-service/internal/errors"
	"auth-service/internal/repo"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"

	"context"
	"fmt"
	"time"
)

type SessionUsecase struct {
	sessionRepo repo.SessionRepo
	userRepo    repo.UserRepo
	tokens      jwt.TokenManager
	log         logger.Interface
}

func NewSessionUsecase(
	sessionRepo repo.SessionRepo,
	userRepo repo.UserRepo,
	tokens jwt.TokenManager,
	log logger.Interface,
) *SessionUsecase {
	return &SessionUsecase{
		sessionRepo: sessionRepo,
		userRepo:    userRepo,
		tokens:      tokens,
		log:         log,
	}
}

func (uc *SessionUsecase) Refresh(ctx context.Context, oldToken string) (string, string, error) {
	uc.log.Debug("session.Refresh called")

	// 1) проверить подпись и срок JWT
	userID, role, err := uc.tokens.ValidateRefresh(oldToken)
	if err != nil {
		uc.log.Warn("invalid refresh token", "err", err)
		return "", "", fmt.Errorf("session.Refresh - validate token: %w", err)
	}

	// 2) проверить, что сессия есть в БД
	sess, err := uc.sessionRepo.GetByToken(ctx, oldToken)
	if err != nil {
		uc.log.Error("failed to get session by token", "err", err)
		return "", "", fmt.Errorf("session.Refresh - get session: %w", err)
	}

	if sess.UserID != userID {
		uc.log.Warn("token userID mismatch", "tokenUserID", sess.UserID, "expected", userID)
		return "", "", fmt.Errorf("session.Refresh - userID mismatch: %w", err)
	}

	// 3) Проверка истечения сессии
	if time.Now().After(sess.ExpiresAt) {
		uc.log.Warn("refresh token expired")
		return "", "", errors.ErrExpiredToken
	}

	// 4) удалить старую
	if err := uc.sessionRepo.DeleteByToken(ctx, oldToken); err != nil {
		uc.log.Error("failed to delete old session", "err", err)
		return "", "", fmt.Errorf("session.Refresh - delete old session: %w", err)
	}

	// 5) сгенерить новую пару
	tokens, err := uc.tokens.Generate(userID, role)
	if err != nil {
		uc.log.Error("failed to generate new token pair", "err", err)
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
		uc.log.Error("failed to save new session", "err", err)
		return "", "", fmt.Errorf("session.Refresh - save session: %w", err)
	}

	uc.log.Info("refresh successful", "userID", userID)
	return tokens.AccessToken, tokens.RefreshToken, nil
}

func (uc *SessionUsecase) List(ctx context.Context, userID int64) ([]entity.Session, error) {
	uc.log.Debug("session.List called", "userID", userID)
	sessions, err := uc.sessionRepo.ListActiveByUser(ctx, userID)
	if err != nil {
		uc.log.Error("failed to list sessions", "err", err)
		return nil, fmt.Errorf("session.List - get active sessions: %w", err)
	}
	if len(sessions) == 0 {
		uc.log.Warn("no active sessions found", "userID", userID)
		return nil, errors.ErrNotFound
	}
	uc.log.Info("active sessions listed", "count", len(sessions))
	return sessions, nil
}

func (uc *SessionUsecase) Revoke(ctx context.Context, token string) error {
	uc.log.Debug("session.Revoke called")
	if err := uc.sessionRepo.DeleteByToken(ctx, token); err != nil {
		uc.log.Error("failed to revoke session", "err", err)
		return fmt.Errorf("session.Revoke - delete by token: %w", err)
	}
	uc.log.Info("session revoked")
	return nil
}

func (uc *SessionUsecase) RevokeAll(ctx context.Context, userID int64) error {
	uc.log.Debug("session.RevokeAll called", "userID", userID)
	if err := uc.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
		uc.log.Error("failed to revoke all sessions", "err", err)
		return fmt.Errorf("session.RevokeAll - delete by userID: %w", err)
	}
	uc.log.Info("all sessions revoked", "userID", userID)
	return nil
}

func (uc *SessionUsecase) DeleteExpired(ctx context.Context) error {
	uc.log.Debug("session.DeleteExpired called")

	if err := ctx.Err(); err != nil {
		uc.log.Warn("context error during session cleanup", "err", err)
		return fmt.Errorf("sessionUsecase.DeleteExpired: context error: %w", err)
	}

	if err := uc.sessionRepo.DeleteExpired(ctx); err != nil {
		uc.log.Error("failed to delete expired sessions", "err", err)
		return fmt.Errorf("sessionUsecase.DeleteExpired: failed to delete expired sessions: %w", err)
	}

	uc.log.Info("expired sessions deleted")
	return nil
}
