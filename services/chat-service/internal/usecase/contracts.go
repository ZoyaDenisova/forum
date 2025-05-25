package usecase

import (
	"context"
	"time"

	"chat-service/internal/entity"
)

type CategoryUsecase interface {
	ListCategories(ctx context.Context) ([]*entity.Category, error)
	GetCategory(ctx context.Context, id int64) (*entity.Category, error)
	CreateCategory(ctx context.Context, p CreateCategoryParams) (int64, error)
	UpdateCategory(ctx context.Context, c *entity.Category) error
	DeleteCategory(ctx context.Context, id int64) error
}

type TopicUsecase interface {
	ListTopics(ctx context.Context, categoryID int64) ([]*entity.Topic, error)
	GetTopic(ctx context.Context, id int64) (*entity.Topic, error)
	CreateTopic(ctx context.Context, p TopicParams) (int64, error)
	UpdateTopic(ctx context.Context, id int64, p TopicParams) (int64, error)
	DeleteTopic(ctx context.Context, id int64) error
}

type MessageUsecase interface {
	SendMessage(ctx context.Context, p SendMessageParams) error
	UpdateMessage(ctx context.Context, id int64, newContent string) error
	DeleteMessage(ctx context.Context, id int64) error
	GetMessages(ctx context.Context, topicID int64) ([]*entity.Message, error)
	CleanupOldMessages(ctx context.Context, threshold time.Time) error
}
