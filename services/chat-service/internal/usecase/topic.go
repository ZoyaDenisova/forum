package usecase

import (
	"chat-service/internal/auth"
	"context"
	"errors"
	"fmt"
	"github.com/ZoyaDenisova/go-common/logger"
	"time"

	"chat-service/internal/entity"
	repoErr "chat-service/internal/errors"
	"chat-service/internal/repo"
)

var (
	ErrTopicNotFound = errors.New("topic not found")
)

type TopicUC struct {
	repo repo.TopicRepository
	log  logger.Interface
}

func NewTopicUsecase(r repo.TopicRepository, l logger.Interface) *TopicUC {
	return &TopicUC{repo: r, log: l}
}

// ListTopics возвращает все топики в категории
func (uc *TopicUC) ListTopics(ctx context.Context, categoryID int64) ([]*entity.Topic, error) {
	uc.log.Debug("ListTopics called", "category_id", categoryID)

	list, err := uc.repo.GetByCategory(ctx, categoryID)
	if err != nil {
		uc.log.Error("repo.GetByCategory failed", "err", err)
		return nil, fmt.Errorf("TopicUC.List: %w", err)
	}

	if len(list) == 0 {
		uc.log.Warn("no topics found in category", "category_id", categoryID)
	} else {
		uc.log.Info("topics retrieved", "count", len(list), "category_id", categoryID)
	}
	return list, nil
}

func (uc *TopicUC) GetTopic(ctx context.Context, id int64) (*entity.Topic, error) {
	uc.log.Debug("GetTopic called", "id", id)

	t, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repoErr.ErrNotFound) {
			uc.log.Info("topic not found", "id", id)
			return nil, ErrTopicNotFound
		}
		uc.log.Error("repo.GetByID failed", "err", err)
		return nil, fmt.Errorf("TopicUC.Get: %w", err)
	}

	uc.log.Info("topic retrieved", "id", t.ID, "title", t.Title)
	return t, nil
}

// CreateTopic создаёт новый топик и возвращает его ID
func (uc *TopicUC) CreateTopic(ctx context.Context, p TopicParams) (int64, error) {
	uc.log.Debug("CreateTopic called", "title", p.Title, "category_id", p.CategoryID)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to create topic")
		return 0, ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		uc.log.Warn("unauthorized role tried to create topic", "role", role)
		return 0, ErrForbidden
	}

	t := &entity.Topic{
		CategoryID:  p.CategoryID,
		Title:       p.Title,
		Description: p.Description,
		AuthorID:    p.AuthorID,
		CreatedAt:   time.Now().UTC(),
	}
	id, err := uc.repo.Create(ctx, t)
	if err != nil {
		uc.log.Error("repo.Create failed", "err", err)
		return 0, fmt.Errorf("TopicUC.Create: %w", err)
	}

	uc.log.Info("topic created", "id", id, "category_id", p.CategoryID)
	return id, nil
}

func (uc *TopicUC) UpdateTopic(ctx context.Context, id int64, params TopicParams,
) (int64, error) {
	uc.log.Debug("UpdateTopic called", "id", id)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to update topic")
		return 0, ErrUnauthenticated
	}

	t, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		uc.log.Info("topic not found for update", "id", id)
		return 0, ErrTopicNotFound
	} else if err != nil {
		uc.log.Error("repo.GetByID failed", "err", err)
		return 0, fmt.Errorf("TopicUC.Update#get: %w", err)
	}

	if t.AuthorID != userID && role != "admin" {
		uc.log.Warn("unauthorized user tried to update topic", "topic_id", id, "user_id", userID)
		return 0, ErrForbidden
	}

	t.Title = params.Title
	t.Description = params.Description

	newID, err := uc.repo.Update(ctx, t)
	if err != nil {
		uc.log.Error("repo.Update failed", "err", err)
		return 0, fmt.Errorf("TopicUC.Update: %w", err)
	}

	uc.log.Info("topic updated", "id", newID)
	return newID, nil
}

func (uc *TopicUC) DeleteTopic(ctx context.Context, id int64) error {
	uc.log.Debug("DeleteTopic called", "id", id)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to update topic")
		return ErrUnauthenticated
	}

	t, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		uc.log.Info("topic not found for delete", "id", id)
		return ErrTopicNotFound
	} else if err != nil {
		uc.log.Error("repo.GetByID failed", "err", err)
		return fmt.Errorf("TopicUC.Delete#get: %w", err)
	}

	if t.AuthorID != userID && role != "admin" {
		uc.log.Warn("unauthorized user tried to delete topic", "topic_id", id, "user_id", userID)
		return ErrForbidden
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		uc.log.Error("repo.Delete failed", "err", err)
		return fmt.Errorf("TopicUC.Delete: %w", err)
	}

	uc.log.Info("topic deleted", "id", id)
	return nil
}
