package usecase

import (
	"chat-service/internal/auth"
	"chat-service/internal/entity"
	customErr "chat-service/internal/errors"
	"chat-service/internal/usecase/mocks"
	"context"
	"errors"
	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/require"
	"testing"
	"time"
)

func TestMessageUC_SendMessage(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockMessageRepository(ctrl)
	publisher := mocks.NewMockMessagePublisher(ctrl)
	log := mocks.FakeLogger{}
	uc := NewMessageUsecase(repo, publisher, log)

	ctx := auth.WithUser(context.Background(), 1, "user")
	params := SendMessageParams{
		TopicID:  10,
		AuthorID: 1,
		Content:  "test message",
	}

	t.Run("success", func(t *testing.T) {
		repo.EXPECT().Create(ctx, gomock.Any()).Return(nil)
		publisher.EXPECT().Publish(params.TopicID, gomock.Any())
		err := uc.SendMessage(ctx, params)
		require.NoError(t, err)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		err := uc.SendMessage(context.Background(), params)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "guest")
		err := uc.SendMessage(ctx, params)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo error", func(t *testing.T) {
		repo.EXPECT().Create(ctx, gomock.Any()).Return(errors.New("db error"))
		err := uc.SendMessage(ctx, params)
		require.ErrorContains(t, err, "MessageUC.Send")
	})
}

func TestMessageUC_UpdateMessage(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockMessageRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewMessageUsecase(repo, nil, log)

	ctx := auth.WithUser(context.Background(), 1, "user")

	t.Run("success", func(t *testing.T) {
		msg := &entity.Message{ID: 1, AuthorID: 1}
		repo.EXPECT().GetByID(ctx, int64(1)).Return(msg, nil)
		repo.EXPECT().Update(ctx, int64(1), "updated").Return(nil)
		err := uc.UpdateMessage(ctx, 1, "updated")
		require.NoError(t, err)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		err := uc.UpdateMessage(context.Background(), 1, "x")
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden by role", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "guest")
		err := uc.UpdateMessage(ctx, 1, "x")
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("not found", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(2)).Return(nil, customErr.ErrNotFound)
		err := uc.UpdateMessage(ctx, 2, "x")
		require.ErrorIs(t, err, ErrMessageNotFound)
	})

	t.Run("foreign author", func(t *testing.T) {
		msg := &entity.Message{ID: 3, AuthorID: 999}
		repo.EXPECT().GetByID(ctx, int64(3)).Return(msg, nil)
		err := uc.UpdateMessage(ctx, 3, "x")
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("update error", func(t *testing.T) {
		msg := &entity.Message{ID: 4, AuthorID: 1}
		repo.EXPECT().GetByID(ctx, int64(4)).Return(msg, nil)
		repo.EXPECT().Update(ctx, int64(4), "x").Return(errors.New("fail"))
		err := uc.UpdateMessage(ctx, 4, "x")
		require.ErrorContains(t, err, "MessageUC.Update")
	})

	t.Run("repo.GetByID general error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "user")
		repo.EXPECT().
			GetByID(ctx, int64(5)).
			Return(nil, errors.New("db connection lost"))

		err := uc.UpdateMessage(ctx, 5, "content")
		require.ErrorContains(t, err, "MessageUC.Update#get")
	})
}

func TestMessageUC_DeleteMessage(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockMessageRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewMessageUsecase(repo, nil, log)

	ctx := auth.WithUser(context.Background(), 1, "user")

	t.Run("success", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(1)).Return(&entity.Message{ID: 1, AuthorID: 1}, nil)
		repo.EXPECT().Delete(ctx, int64(1)).Return(nil)
		err := uc.DeleteMessage(ctx, 1)
		require.NoError(t, err)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		err := uc.DeleteMessage(context.Background(), 1)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden role", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "guest")
		err := uc.DeleteMessage(ctx, 1)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("not found", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(2)).Return(nil, customErr.ErrNotFound)
		err := uc.DeleteMessage(ctx, 2)
		require.ErrorIs(t, err, ErrMessageNotFound)
	})

	t.Run("foreign author - not admin", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(3)).Return(&entity.Message{ID: 3, AuthorID: 42}, nil)
		err := uc.DeleteMessage(ctx, 3)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("delete error", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(4)).Return(&entity.Message{ID: 4, AuthorID: 1}, nil)
		repo.EXPECT().Delete(ctx, int64(4)).Return(errors.New("fail"))
		err := uc.DeleteMessage(ctx, 4)
		require.ErrorContains(t, err, "MessageUC.Delete")
	})

	t.Run("repo.GetByID general error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "user")
		repo.EXPECT().
			GetByID(ctx, int64(5)).
			Return(nil, errors.New("unexpected timeout"))

		err := uc.DeleteMessage(ctx, 5)
		require.ErrorContains(t, err, "MessageUC.Delete#get")
	})
}

func TestMessageUC_GetMessages(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockMessageRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewMessageUsecase(repo, nil, log)

	topicID := int64(100)

	t.Run("success", func(t *testing.T) {
		expected := []*entity.Message{{ID: 1}, {ID: 2}}
		repo.EXPECT().GetByTopic(context.Background(), topicID).Return(expected, nil)
		list, err := uc.GetMessages(context.Background(), topicID)
		require.NoError(t, err)
		require.Equal(t, expected, list)
	})

	t.Run("repo error", func(t *testing.T) {
		repo.EXPECT().GetByTopic(context.Background(), topicID).Return(nil, errors.New("fail"))
		list, err := uc.GetMessages(context.Background(), topicID)
		require.Nil(t, list)
		require.ErrorContains(t, err, "MessageUC.List")
	})
}

func TestMessageUC_CleanupOldMessages(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockMessageRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewMessageUsecase(repo, nil, log)

	threshold := time.Now().Add(-24 * time.Hour)

	t.Run("success", func(t *testing.T) {
		repo.EXPECT().DeleteOlderThan(context.Background(), threshold).Return(nil)
		err := uc.CleanupOldMessages(context.Background(), threshold)
		require.NoError(t, err)
	})

	t.Run("repo error", func(t *testing.T) {
		repo.EXPECT().DeleteOlderThan(context.Background(), threshold).Return(errors.New("db err"))
		err := uc.CleanupOldMessages(context.Background(), threshold)
		require.ErrorContains(t, err, "MessageUC.Cleanup")
	})
}
