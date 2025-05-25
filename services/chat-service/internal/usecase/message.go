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
	ErrMessageNotFound = errors.New("message not found")
)

type MessagePublisher interface {
	Publish(topicID int64, m *entity.WSEvent)
}

type MessageUC struct {
	repo      repo.MessageRepository
	publisher MessagePublisher
	log       logger.Interface
}

func NewMessageUsecase(r repo.MessageRepository, p MessagePublisher, l logger.Interface) *MessageUC {
	return &MessageUC{repo: r, publisher: p, log: l}
}

// SendMessage сохраняет сообщение и рассылает его по WebSocket
func (uc *MessageUC) SendMessage(ctx context.Context, p SendMessageParams) (*entity.Message, error) {
	uc.log.Debug("SendMessage called", "topic_id", p.TopicID, "author_id", p.AuthorID)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to send message")
		return nil, ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		uc.log.Warn("unauthorized role tried to send message", "role", role)
		return nil, ErrForbidden
	}

	m := &entity.Message{
		TopicID:   p.TopicID,
		AuthorID:  p.AuthorID,
		Content:   p.Content,
		CreatedAt: time.Now().UTC(),
	}

	// repo.Create проставит m.ID (RETURNING id)
	if err := uc.repo.Create(ctx, m); err != nil {
		uc.log.Error("repo.Create failed", "err", err)
		return nil, fmt.Errorf("MessageUC.Send: %w", err)
	}

	uc.publisher.Publish(p.TopicID, &entity.WSEvent{
		Action:  entity.ActionCreated,
		Message: m,
	})
	uc.log.Info("message sent", "id", m.ID, "topic_id", m.TopicID)
	return m, nil
}

func (uc *MessageUC) UpdateMessage(ctx context.Context, id int64, newContent string) error {
	uc.log.Debug("UpdateMessage called", "id", id)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to update message", "id", id)
		return ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		uc.log.Warn("unauthorized role tried to update message", "role", role)
		return ErrForbidden
	}

	m, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		uc.log.Info("message not found during update", "id", id)
		return ErrMessageNotFound
	} else if err != nil {
		uc.log.Error("repo.GetByID failed", "err", err)
		return fmt.Errorf("MessageUC.Update#get: %w", err)
	}

	if m.AuthorID != userID {
		uc.log.Warn("user tried to update message not belonging to them", "message_id", id, "user_id", userID)
		return ErrForbidden
	}

	if err := uc.repo.Update(ctx, id, newContent); err != nil {
		uc.log.Error("repo.Update failed", "err", err)
		return fmt.Errorf("MessageUC.Update: %w", err)
	}

	updated := &entity.Message{
		ID:        id,
		TopicID:   m.TopicID,
		AuthorID:  m.AuthorID,
		Content:   newContent,
		CreatedAt: m.CreatedAt,
	}

	uc.publisher.Publish(m.TopicID, &entity.WSEvent{
		Action:  entity.ActionUpdated,
		Message: updated,
	})

	uc.log.Info("message updated", "id", id)
	return nil
}

func (uc *MessageUC) DeleteMessage(ctx context.Context, id int64) error {
	uc.log.Debug("DeleteMessage called", "id", id)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to delete message", "id", id)
		return ErrUnauthenticated
	}
	if role != "user" && role != "admin" {
		uc.log.Warn("unauthorized role tried to delete message", "role", role)
		return ErrForbidden
	}

	m, err := uc.repo.GetByID(ctx, id)
	if errors.Is(err, repoErr.ErrNotFound) {
		uc.log.Info("message not found during delete", "id", id)
		return ErrMessageNotFound
	} else if err != nil {
		uc.log.Error("repo.GetByID failed", "err", err)
		return fmt.Errorf("MessageUC.Delete#get: %w", err)
	}

	if m.AuthorID != userID && role != "admin" {
		uc.log.Warn("user tried to delete message not belonging to them", "message_id", id, "user_id", userID)
		return ErrForbidden
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		uc.log.Error("repo.Delete failed", "err", err)
		return fmt.Errorf("MessageUC.Delete: %w", err)
	}

	uc.publisher.Publish(m.TopicID, &entity.WSEvent{
		Action:    entity.ActionDeleted,
		MessageID: id,
	})

	uc.log.Info("message deleted", "id", id)
	return nil
}

// GetMessages возвращает историю сообщений в топике
func (uc *MessageUC) GetMessages(ctx context.Context, topicID int64) ([]*entity.Message, error) {
	uc.log.Debug("GetMessages called", "topic_id", topicID)

	list, err := uc.repo.GetByTopic(ctx, topicID)
	if err != nil {
		uc.log.Error("repo.GetByTopic failed", "err", err)
		return nil, fmt.Errorf("MessageUC.List: %w", err)
	}

	uc.log.Info("messages retrieved", "topic_id", topicID, "count", len(list))
	return list, nil
}

// CleanupOldMessages удаляет устаревшие сообщения (для cron)
func (uc *MessageUC) CleanupOldMessages(ctx context.Context, threshold time.Time) error {
	uc.log.Debug("CleanupOldMessages called", "threshold", threshold)

	if err := uc.repo.DeleteOlderThan(ctx, threshold); err != nil {
		uc.log.Error("repo.DeleteOlderThan failed", "err", err)
		return fmt.Errorf("MessageUC.Cleanup: %w", err)
	}

	uc.log.Info("old messages deleted", "threshold", threshold)
	return nil
}
