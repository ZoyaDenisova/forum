package repo

import (
	"context"
	"time"

	"chat-service/internal/entity"
)

type CategoryRepository interface {
	GetAll(ctx context.Context) ([]*entity.Category, error)
	GetByID(ctx context.Context, id int64) (*entity.Category, error)
	Create(ctx context.Context, c *entity.Category) error
	Update(ctx context.Context, c *entity.Category) error
	Delete(ctx context.Context, id int64) error
}

type TopicRepository interface {
	GetByCategory(ctx context.Context, categoryID int64) ([]*entity.Topic, error)
	GetByID(ctx context.Context, id int64) (*entity.Topic, error)
	Create(ctx context.Context, t *entity.Topic) (int64, error)
	Update(ctx context.Context, t *entity.Topic) (int64, error)
	Delete(ctx context.Context, id int64) error
}

type MessageRepository interface {
	Create(ctx context.Context, m *entity.Message) error
	Update(ctx context.Context, id int64, newContent string) error
	Delete(ctx context.Context, id int64) error
	GetByTopic(ctx context.Context, topicID int64) ([]*entity.Message, error)
	GetByID(ctx context.Context, id int64) (*entity.Message, error)
	DeleteOlderThan(ctx context.Context, threshold time.Time) error
}
