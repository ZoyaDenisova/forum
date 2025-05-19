package usecase

import (
	"chat-service/internal/auth"
	"context"
	"errors"
	"fmt"
	"time"

	"chat-service/internal/entity"
	repoErr "chat-service/internal/errors"
	"chat-service/internal/repo"
)

var (
	ErrTopicNotFound = errors.New("topic not found")
)

type TopicUsecase struct {
	repo repo.TopicRepository
}

func NewTopicUsecase(r repo.TopicRepository) TopicUsecase {
	return TopicUsecase{repo: r}
}

// ListTopics возвращает все топики в категории
func (uc *TopicUsecase) ListTopics(ctx context.Context, categoryID int64) ([]*entity.Topic, error) {
	list, err := uc.repo.GetByCategory(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("TopicUsecase.List: %w", err)
	}
	return list, nil
}

// GetTopic возвращает топик по ID
func (uc *TopicUsecase) GetTopic(ctx context.Context, id int64) (*entity.Topic, error) {
	t, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repoErr.ErrNotFound) {
			return nil, ErrTopicNotFound
		}
		return nil, fmt.Errorf("TopicUsecase.Get: %w", err)
	}
	return t, nil
}

// CreateTopic создаёт новый топик и возвращает его ID
func (uc *TopicUsecase) CreateTopic(ctx context.Context, p TopicParams) (int64, error) {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return 0, ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		return 0, ErrForbidden
	}
	t := &entity.Topic{
		CategoryID:  p.CategoryID,
		Title:       p.Title,
		Description: p.Description,
		AuthorID:    p.AuthorID,
		CreatedAt:   time.Now().UTC(),
	}
	return uc.repo.Create(ctx, t)
}

func (uc *TopicUsecase) UpdateTopic(ctx context.Context, id int64, params TopicParams,
) (int64, error) {
	userID, role := auth.FromContext(ctx)
	t, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		return 0, ErrTopicNotFound
	} else if err != nil {
		return 0, fmt.Errorf("TopicUsecase.Update#get: %w", err)
	}
	if t.AuthorID != userID && role != "admin" {
		return 0, ErrForbidden
	}
	t.Title = params.Title
	t.Description = params.Description
	return uc.repo.Update(ctx, t)
}

func (uc *TopicUsecase) DeleteTopic(ctx context.Context, id int64) error {
	userID, role := auth.FromContext(ctx)
	t, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		return ErrTopicNotFound
	} else if err != nil {
		return fmt.Errorf("TopicUsecase.Delete#get: %w", err)
	}
	if t.AuthorID != userID && role != "admin" {
		return ErrForbidden
	}
	return uc.repo.Delete(ctx, id)
}
