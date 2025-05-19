package usecase

import (
	"auth-service/internal/entity"
	dbErrors "auth-service/internal/errors"
	"auth-service/internal/repo"
	"github.com/ZoyaDenisova/go-common/hasher"
	"github.com/ZoyaDenisova/go-common/jwt"

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
}

func NewUserUsecase(
	userRepo repo.UserRepo,
	sessionRepo repo.SessionRepo,
	hasher hasher.PasswordHasher,
	tokens jwt.TokenManager,
) *UserUsecase {
	return &UserUsecase{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		hasher:      hasher,
		tokens:      tokens,
	}
}

func (uc *UserUsecase) Register(ctx context.Context, name, email, password string) error {
	_, err := uc.userRepo.GetByEmail(ctx, email)
	if err == nil {
		return ErrUserExists
	}
	if !errors.Is(err, dbErrors.ErrNotFound) {
		return fmt.Errorf("user.Register: lookup email: %w", err)
	}

	hash, err := uc.hasher.Hash(password)
	if err != nil {
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
		return fmt.Errorf("user.Register: create user: %w", err)
	}

	return nil
}

func (uc *UserUsecase) Login(ctx context.Context, email, password, ua string) (string, string, error) {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", "", ErrInvalidCreds
	}

	if err := uc.hasher.Verify(user.PasswordHash, password); err != nil {
		return "", "", ErrInvalidCreds
	}

	tokens, err := uc.tokens.Generate(user.ID, user.Role)
	if err != nil {
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
		return "", "", fmt.Errorf("user.Login - save session: %w", err)
	}

	return tokens.AccessToken, tokens.RefreshToken, nil
}

func (uc *UserUsecase) Update(ctx context.Context, id int64, params UpdateUserParams) error {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("user.Update: lookup: %w", err)
	}

	if params.Name != nil {
		user.Name = *params.Name
	}

	if params.Email != nil && *params.Email != user.Email {
		if _, e := uc.userRepo.GetByEmail(ctx, *params.Email); e == nil {
			return ErrUserExists
		} else if !errors.Is(e, dbErrors.ErrNotFound) {
			return fmt.Errorf("user.Update: lookup email: %w", e)
		}
		user.Email = *params.Email
	}

	if params.Password != nil {
		hash, e := uc.hasher.Hash(*params.Password)
		if e != nil {
			return fmt.Errorf("user.Update: hash pwd: %w", e)
		}
		user.PasswordHash = hash
	}

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("user.Update: update: %w", err)
	}
	return nil
}

func (uc *UserUsecase) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user usecase: get by id failed: %w", err)
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}
