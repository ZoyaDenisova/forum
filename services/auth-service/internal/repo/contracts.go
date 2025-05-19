package repo

import (
	"auth-service/internal/entity"
	"context"
)

// todo запускать DeleteExpired как cron-задачу или из периодического фонового воркера
type (
	UserRepo interface {
		Create(ctx context.Context, u *entity.User) error
		Update(ctx context.Context, u *entity.User) error
		GetByID(ctx context.Context, userID int64) (*entity.User, error)
		GetByEmail(ctx context.Context, email string) (*entity.User, error)
		GetByUsername(ctx context.Context, username string) (*entity.User, error)
		Delete(ctx context.Context, id int64) error
	}
	SessionRepo interface {
		Save(ctx context.Context, s *entity.Session) error
		GetByToken(ctx context.Context, token string) (*entity.Session, error)
		ListActiveByUser(ctx context.Context, userID int64) ([]entity.Session, error)
		// DeleteByToken удаляет сессию по токену (logout из одного устройства).
		DeleteByToken(ctx context.Context, token string) error
		// DeleteByUserID удаляет все сессии пользователя (logout со всех устройств).
		DeleteByUserID(ctx context.Context, userID int64) error
		// DeleteExpired удаляет все просроченные сессии (для периодической очистки).
		DeleteExpired(ctx context.Context) error
	}
)
