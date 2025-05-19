// internal/usecase/message_usecase.go
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
	ErrMessageNotFound = errors.New("message not found")
)

type MessagePublisher interface {
	Publish(topicID int64, m *entity.Message)
}

type MessageUsecase struct {
	repo      repo.MessageRepository
	publisher MessagePublisher
}

func NewMessageUsecase(r repo.MessageRepository, p MessagePublisher) MessageUsecase {
	return MessageUsecase{repo: r, publisher: p}
}

// SendMessage сохраняет сообщение и рассылает его по WebSocket
func (uc *MessageUsecase) SendMessage(ctx context.Context, p SendMessageParams) error {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		return ErrForbidden
	}
	m := &entity.Message{
		TopicID:   p.TopicID,
		AuthorID:  p.AuthorID,
		Content:   p.Content,
		CreatedAt: time.Now().UTC(),
	}
	if err := uc.repo.Create(ctx, m); err != nil {
		return fmt.Errorf("MessageUsecase.Send: %w", err)
	}
	uc.publisher.Publish(p.TopicID, m)
	return nil
}

func (uc *MessageUsecase) UpdateMessage(ctx context.Context, id int64, newContent string) error {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		return ErrForbidden
	}
	m, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		return ErrMessageNotFound
	} else if err != nil {
		return fmt.Errorf("MessageUsecase.Update#get: %w", err)
	}
	if m.AuthorID != userID {
		return ErrForbidden
	}
	return uc.repo.Update(ctx, id, newContent)
}

func (uc *MessageUsecase) DeleteMessage(ctx context.Context, id int64) error {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		return ErrForbidden
	}
	m, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		return ErrMessageNotFound
	} else if err != nil {
		return fmt.Errorf("MessageUsecase.Delete#get: %w", err)
	}
	if m.AuthorID != userID && role != "admin" {
		return ErrForbidden
	}
	return uc.repo.Delete(ctx, id)
}

// GetMessages возвращает историю сообщений в топике
func (uc *MessageUsecase) GetMessages(ctx context.Context, topicID int64) ([]*entity.Message, error) {
	list, err := uc.repo.GetByTopic(ctx, topicID)
	if err != nil {
		return nil, fmt.Errorf("MessageUsecase.List: %w", err)
	}
	return list, nil
}

// CleanupOldMessages удаляет устаревшие сообщения (для cron)
func (uc *MessageUsecase) CleanupOldMessages(ctx context.Context, threshold time.Time) error {
	if err := uc.repo.DeleteOlderThan(ctx, threshold); err != nil {
		return fmt.Errorf("MessageUsecase.Cleanup: %w", err)
	}
	return nil
}
