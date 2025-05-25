package usecase

import (
	"auth-service/internal/auth" // если уже есть пакет с контекстными клеймами
	"auth-service/internal/entity"
	dbErrors "auth-service/internal/errors"
	"auth-service/internal/repo"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ZoyaDenisova/go-common/hasher"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
)

var (
	ErrUserExists   = errors.New("user already exists")
	ErrInvalidCreds = errors.New("invalid credentials")
	ErrUserBlocked  = errors.New("user is blocked")
	ErrForbidden    = errors.New("forbidden")
)

type UserUsecase struct {
	userRepo    repo.UserRepo
	sessionRepo repo.SessionRepo
	hasher      hasher.PasswordHasher
	tokens      jwt.TokenManager
	log         logger.Interface
}

func NewUserUsecase(
	userRepo repo.UserRepo,
	sessionRepo repo.SessionRepo,
	hasher hasher.PasswordHasher,
	tokens jwt.TokenManager,
	log logger.Interface,
) *UserUsecase {
	return &UserUsecase{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		hasher:      hasher,
		tokens:      tokens,
		log:         log,
	}
}

// Register создаёт нового пользователя с is_blocked = FALSE.
func (uc *UserUsecase) Register(ctx context.Context, name, email, password string) error {
	uc.log.Debug("Register called", "email", email)

	if _, err := uc.userRepo.GetByEmail(ctx, email); err == nil {
		uc.log.Warn("email already exists", "email", email)
		return ErrUserExists
	} else if !errors.Is(err, dbErrors.ErrNotFound) {
		uc.log.Error("error looking up email", "err", err)
		return fmt.Errorf("user.Register: lookup email: %w", err)
	}

	hash, err := uc.hasher.Hash(password)
	if err != nil {
		uc.log.Error("password hashing failed", "err", err)
		return fmt.Errorf("user.Register: hash password: %w", err)
	}

	user := &entity.User{
		Name:         name,
		Email:        email,
		PasswordHash: hash,
		Role:         "user",
		CreatedAt:    time.Now().UTC(),
		IsBlocked:    false,
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		uc.log.Error("failed to create user", "err", err)
		return fmt.Errorf("user.Register: create user: %w", err)
	}

	uc.log.Info("user registered", "userID", user.ID)
	return nil
}

// Login проходит аутентификацию и возвращает пару токенов.
func (uc *UserUsecase) Login(ctx context.Context, email, password, ua string) (string, string, error) {
	uc.log.Debug("Login called", "email", email)

	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		uc.log.Warn("invalid credentials: email not found", "email", email)
		return "", "", ErrInvalidCreds
	}

	// Заблокированный пользователь не может войти
	if user.IsBlocked {
		uc.log.Warn("blocked user tried to login", "userID", user.ID)
		return "", "", ErrUserBlocked
	}

	if err := uc.hasher.Verify(user.PasswordHash, password); err != nil {
		uc.log.Warn("invalid credentials: password mismatch", "email", email)
		return "", "", ErrInvalidCreds
	}

	tokens, err := uc.tokens.Generate(user.ID, user.Role)
	if err != nil {
		uc.log.Error("token generation failed", "err", err)
		return "", "", fmt.Errorf("user.Login - token gen error: %w", err)
	}

	session := &entity.Session{
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    ua,
		CreatedAt:    time.Now().UTC(),
		ExpiresAt:    tokens.RefreshExpires,
	}

	if err := uc.sessionRepo.Save(ctx, session); err != nil {
		uc.log.Error("failed to save session", "err", err)
		return "", "", fmt.Errorf("user.Login - save session: %w", err)
	}

	uc.log.Info("user logged in", "userID", user.ID)
	return tokens.AccessToken, tokens.RefreshToken, nil
}

// Update изменяет базовые поля пользователя. Блокировка управляется отдельными методами.
func (uc *UserUsecase) Update(ctx context.Context, id int64, params UpdateUserParams) error {
	uc.log.Debug("Update called", "userID", id)

	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		uc.log.Error("user lookup failed", "err", err)
		return fmt.Errorf("user.Update: lookup: %w", err)
	}

	if user.IsBlocked {
		uc.log.Warn("blocked user tried to update profile", "userID", id)
		return ErrUserBlocked
	}

	if params.Name != nil {
		user.Name = *params.Name
	}

	if params.Email != nil && *params.Email != user.Email {
		if _, e := uc.userRepo.GetByEmail(ctx, *params.Email); e == nil {
			uc.log.Warn("email already exists", "email", *params.Email)
			return ErrUserExists
		} else if !errors.Is(e, dbErrors.ErrNotFound) {
			uc.log.Error("email lookup error", "err", e)
			return fmt.Errorf("user.Update: lookup email: %w", e)
		}
		user.Email = *params.Email
	}

	if params.Password != nil {
		hash, e := uc.hasher.Hash(*params.Password)
		if e != nil {
			uc.log.Error("password hashing failed", "err", e)
			return fmt.Errorf("user.Update: hash pwd: %w", e)
		}
		user.PasswordHash = hash
	}

	if err := uc.userRepo.Update(ctx, user); err != nil {
		uc.log.Error("user update failed", "err", err)
		return fmt.Errorf("user.Update: update: %w", err)
	}

	uc.log.Info("user updated", "userID", user.ID)
	return nil
}

func (uc *UserUsecase) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	uc.log.Debug("GetByID called", "userID", id)

	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		uc.log.Error("get user by id failed", "err", err)
		return nil, fmt.Errorf("user usecase: get by id failed: %w", err)
	}

	if user == nil {
		uc.log.Warn("user not found", "userID", id)
		return nil, errors.New("user not found")
	}

	uc.log.Info("user fetched", "userID", user.ID)
	return user, nil
}

// Block ставит is_blocked = TRUE и удаляет активные refresh‑сессии.
func (uc *UserUsecase) Block(ctx context.Context, targetID int64) error {
	uc.log.Debug("Block called", "targetID", targetID)

	// Проверка роли инициатора (админ). Предполагаем middleware, но дублируем для безопасности.
	if uid, role := auth.FromContext(ctx); role != "admin" {
		uc.log.Warn("non‑admin tried to block user", "initiator", uid)
		return ErrForbidden
	}

	if err := uc.userRepo.Block(ctx, targetID); err != nil {
		uc.log.Error("block failed", "err", err)
		return fmt.Errorf("user.Block: %w", err)
	}

	// Сделаем так, чтобы заблокированный пользователь не мог рефрешить токены
	if err := uc.sessionRepo.DeleteByUserID(ctx, targetID); err != nil {
		uc.log.Error("session cleanup failed", "err", err)
	}

	uc.log.Info("user blocked", "targetID", targetID)
	return nil
}

// Unblock снимает флаг is_blocked.
func (uc *UserUsecase) Unblock(ctx context.Context, targetID int64) error {
	uc.log.Debug("Unblock called", "targetID", targetID)

	if uid, role := auth.FromContext(ctx); role != "admin" {
		uc.log.Warn("non‑admin tried to unblock user", "initiator", uid)
		return ErrForbidden
	}

	if err := uc.userRepo.Unblock(ctx, targetID); err != nil {
		uc.log.Error("unblock failed", "err", err)
		return fmt.Errorf("user.Unblock: %w", err)
	}

	uc.log.Info("user unblocked", "targetID", targetID)
	return nil
}

func (uc *UserUsecase) GetAll(ctx context.Context) ([]*entity.User, error) {
	_, role := auth.FromContext(ctx)
	if role != "admin" {
		return nil, ErrForbidden
	}

	users, err := uc.userRepo.GetAll(ctx)
	if err != nil {
		uc.log.Error("get all users failed", "err", err)
		return nil, fmt.Errorf("UserUsecase.GetAll: %w", err)
	}

	return users, nil
}
