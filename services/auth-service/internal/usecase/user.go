package usecase

import (
	"auth-service/internal/entity"
	dbErrors "auth-service/internal/errors"
	"auth-service/internal/repo"
	"github.com/ZoyaDenisova/go-common/hasher"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"

	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrUserExists   = errors.New("user already exists")
	ErrInvalidCreds = errors.New("invalid credentials")
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

func (uc *UserUsecase) Register(ctx context.Context, name, email, password string) error {
	uc.log.Debug("Register called", "email", email)

	_, err := uc.userRepo.GetByEmail(ctx, email)
	if err == nil {
		uc.log.Warn("email already exists", "email", email)
		return ErrUserExists
	}
	if !errors.Is(err, dbErrors.ErrNotFound) {
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
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		uc.log.Error("failed to create user", "err", err)
		return fmt.Errorf("user.Register: create user: %w", err)
	}

	uc.log.Info("user registered", "userID", user.ID)
	return nil
}

func (uc *UserUsecase) Login(ctx context.Context, email, password, ua string) (string, string, error) {
	uc.log.Debug("Login called", "email", email)

	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		uc.log.Warn("invalid credentials: email not found", "email", email)
		return "", "", ErrInvalidCreds
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

func (uc *UserUsecase) Update(ctx context.Context, id int64, params UpdateUserParams) error {
	uc.log.Debug("Update called", "userID", id)

	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		uc.log.Error("user lookup failed", "err", err)
		return fmt.Errorf("user.Update: lookup: %w", err)
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
