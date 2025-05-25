package usecase

import (
	"chat-service/internal/auth"
	"chat-service/internal/entity"
	repoErr "chat-service/internal/errors"
	"chat-service/internal/usecase/mocks"
	"context"
	"errors"
	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestTopicUC_ListTopics(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockTopicRepository(ctrl)
	uc := NewTopicUsecase(repo, mocks.FakeLogger{})
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		expected := []*entity.Topic{{ID: 1}, {ID: 2}}
		repo.EXPECT().GetByCategory(ctx, int64(1)).Return(expected, nil)
		res, err := uc.ListTopics(ctx, 1)
		require.NoError(t, err)
		require.Equal(t, expected, res)
	})

	t.Run("repo error", func(t *testing.T) {
		repo.EXPECT().GetByCategory(ctx, int64(1)).Return(nil, errors.New("fail"))
		res, err := uc.ListTopics(ctx, 1)
		require.Nil(t, res)
		require.ErrorContains(t, err, "TopicUC.List")
	})

	t.Run("empty list", func(t *testing.T) {
		repo.EXPECT().GetByCategory(ctx, int64(1)).Return([]*entity.Topic{}, nil)

		result, err := uc.ListTopics(ctx, 1)

		require.NoError(t, err)
		require.Empty(t, result)
	})

}

func TestTopicUC_GetTopic(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockTopicRepository(ctrl)
	uc := NewTopicUsecase(repo, mocks.FakeLogger{})
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, Title: "abc"}
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		res, err := uc.GetTopic(ctx, 1)
		require.NoError(t, err)
		require.Equal(t, topic, res)
	})

	t.Run("not found", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, repoErr.ErrNotFound)
		res, err := uc.GetTopic(ctx, 1)
		require.Nil(t, res)
		require.ErrorIs(t, err, ErrTopicNotFound)
	})

	t.Run("repo error", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, errors.New("fail"))
		res, err := uc.GetTopic(ctx, 1)
		require.Nil(t, res)
		require.ErrorContains(t, err, "TopicUC.Get")
	})
}

func TestTopicUC_CreateTopic(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockTopicRepository(ctrl)
	uc := NewTopicUsecase(repo, mocks.FakeLogger{})
	params := TopicParams{CategoryID: 10, Title: "x", Description: "y", AuthorID: 1}

	t.Run("unauthenticated", func(t *testing.T) {
		ctx := context.Background()
		id, err := uc.CreateTopic(ctx, params)
		require.Zero(t, id)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden role", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "guest")
		id, err := uc.CreateTopic(ctx, params)
		require.Zero(t, id)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		repo.EXPECT().Create(ctx, gomock.Any()).Return(int64(0), errors.New("fail"))
		id, err := uc.CreateTopic(ctx, params)
		require.Zero(t, id)
		require.ErrorContains(t, err, "TopicUC.Create")
	})

	t.Run("success", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		repo.EXPECT().Create(ctx, gomock.Any()).Return(int64(123), nil)
		id, err := uc.CreateTopic(ctx, params)
		require.NoError(t, err)
		require.Equal(t, int64(123), id)
	})
}

func TestTopicUC_UpdateTopic(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockTopicRepository(ctrl)
	uc := NewTopicUsecase(repo, mocks.FakeLogger{})
	params := TopicParams{Title: "x", Description: "y"}

	t.Run("unauthenticated", func(t *testing.T) {
		ctx := context.Background()
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.Zero(t, id)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("not found", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, repoErr.ErrNotFound)
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.Zero(t, id)
		require.ErrorIs(t, err, ErrTopicNotFound)
	})

	t.Run("forbidden by author", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 42}
		ctx := auth.WithUser(context.Background(), 1, "user")
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.Zero(t, id)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo error on get", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, errors.New("fail"))
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.Zero(t, id)
		require.ErrorContains(t, err, "TopicUC.Update#get")
	})

	t.Run("repo error on update", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 1}
		ctx := auth.WithUser(context.Background(), 1, "user")
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		repo.EXPECT().Update(ctx, topic).Return(int64(0), errors.New("fail"))
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.Zero(t, id)
		require.ErrorContains(t, err, "TopicUC.Update")
	})

	t.Run("success", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 1}
		ctx := auth.WithUser(context.Background(), 1, "user")
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		repo.EXPECT().Update(ctx, topic).Return(int64(1), nil)
		id, err := uc.UpdateTopic(ctx, 1, params)
		require.NoError(t, err)
		require.Equal(t, int64(1), id)
	})
}

func TestTopicUC_DeleteTopic(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repo := mocks.NewMockTopicRepository(ctrl)
	uc := NewTopicUsecase(repo, mocks.FakeLogger{})
	ctx := auth.WithUser(context.Background(), 1, "admin")

	t.Run("unauthenticated", func(t *testing.T) {
		err := uc.DeleteTopic(context.Background(), 1)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("not found", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, repoErr.ErrNotFound)
		err := uc.DeleteTopic(ctx, 1)
		require.ErrorIs(t, err, ErrTopicNotFound)
	})

	t.Run("forbidden by author", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 42}
		ctx := auth.WithUser(context.Background(), 1, "user") // <= обязательно не admin
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)

		repo.EXPECT().Delete(gomock.Any(), gomock.Any()).Times(0)

		err := uc.DeleteTopic(ctx, 1)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo error on get", func(t *testing.T) {
		repo.EXPECT().GetByID(ctx, int64(1)).Return(nil, errors.New("fail"))
		err := uc.DeleteTopic(ctx, 1)
		require.ErrorContains(t, err, "TopicUC.Delete#get")
	})

	t.Run("repo error on delete", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 1}
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		repo.EXPECT().Delete(ctx, int64(1)).Return(errors.New("fail"))
		err := uc.DeleteTopic(ctx, 1)
		require.ErrorContains(t, err, "TopicUC.Delete")
	})

	t.Run("success", func(t *testing.T) {
		topic := &entity.Topic{ID: 1, AuthorID: 1}
		repo.EXPECT().GetByID(ctx, int64(1)).Return(topic, nil)
		repo.EXPECT().Delete(ctx, int64(1)).Return(nil)
		err := uc.DeleteTopic(ctx, 1)
		require.NoError(t, err)
	})
}
