package usecase

import (
	"auth-service/internal/entity"
	"context"
)

type (
	User interface {
		Register(ctx context.Context, name, email, password string) error
		Update(ctx context.Context, id int64, params UpdateUserParams) error
		Login(ctx context.Context, email, password, ua string) (string, string, error)
		GetByID(ctx context.Context, id int64) (*entity.User, error)
	}
	Session interface {
		Refresh(ctx context.Context, oldToken string) (string, string, error)
		List(ctx context.Context, userID int64) ([]entity.Session, error)
		Revoke(ctx context.Context, token string) error
		RevokeAll(ctx context.Context, userID int64) error
		DeleteExpired(ctx context.Context) error
	}
)
