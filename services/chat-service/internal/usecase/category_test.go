package usecase

import (
	"chat-service/internal/auth"
	"chat-service/internal/entity"
	customErr "chat-service/internal/errors"
	"chat-service/internal/usecase/mocks"
	"context"
	"errors"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/require"
)

func TestCategoryUC_ListCategories(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockCategoryRepository(ctrl)
	uc := NewCategoryUsecase(mockRepo, mocks.FakeLogger{})

	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		expected := []*entity.Category{
			{ID: 1, Title: "A", Description: "desc"},
			{ID: 2, Title: "B", Description: "desc2"},
		}

		mockRepo.EXPECT().
			GetAll(ctx).
			Return(expected, nil)

		result, err := uc.ListCategories(ctx)

		require.NoError(t, err)
		require.Equal(t, expected, result)
	})

	t.Run("empty result", func(t *testing.T) {
		mockRepo.EXPECT().
			GetAll(ctx).
			Return([]*entity.Category{}, nil)

		result, err := uc.ListCategories(ctx)

		require.NoError(t, err)
		require.Len(t, result, 0)
	})

	t.Run("repo error", func(t *testing.T) {
		mockRepo.EXPECT().
			GetAll(ctx).
			Return(nil, errors.New("db down"))

		result, err := uc.ListCategories(ctx)

		require.Nil(t, result)
		require.ErrorContains(t, err, "CategoryUC.List")
	})
}

func TestCategoryUC_GetCategory(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockCategoryRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewCategoryUsecase(mockRepo, log)

	ctx := context.Background()
	testID := int64(42)

	t.Run("success", func(t *testing.T) {
		expected := &entity.Category{
			ID:          testID,
			Title:       "Test",
			Description: "desc",
		}

		mockRepo.EXPECT().
			GetByID(ctx, testID).
			Return(expected, nil)

		result, err := uc.GetCategory(ctx, testID)
		require.NoError(t, err)
		require.Equal(t, expected, result)
	})

	t.Run("not found", func(t *testing.T) {
		mockRepo.EXPECT().
			GetByID(ctx, testID).
			Return(nil, customErr.ErrNotFound)

		result, err := uc.GetCategory(ctx, testID)
		require.Nil(t, result)
		require.ErrorIs(t, err, ErrCategoryNotFound)
	})

	t.Run("repo error", func(t *testing.T) {
		mockRepo.EXPECT().
			GetByID(ctx, testID).
			Return(nil, errors.New("connection reset"))

		result, err := uc.GetCategory(ctx, testID)
		require.Nil(t, result)
		require.ErrorContains(t, err, "CategoryUC.Get")
	})
}

func TestCategoryUC_CreateCategory(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockCategoryRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewCategoryUsecase(mockRepo, log)

	params := CreateCategoryParams{
		Title:       "Books",
		Description: "All about books",
	}

	t.Run("success - admin creates category", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		mockRepo.EXPECT().
			Create(ctx, gomock.AssignableToTypeOf(&entity.Category{})).
			DoAndReturn(func(_ context.Context, c *entity.Category) error {
				c.ID = 123 // эмулируем запись ID после создания
				return nil
			})

		id, err := uc.CreateCategory(ctx, params)

		require.NoError(t, err)
		require.Equal(t, int64(123), id)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		ctx := context.Background() // без userID

		id, err := uc.CreateCategory(ctx, params)

		require.Zero(t, id)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden - role not admin", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 10, "user")

		id, err := uc.CreateCategory(ctx, params)

		require.Zero(t, id)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")
		mockRepo.EXPECT().
			Create(ctx, gomock.Any()).
			Return(errors.New("db error"))

		id, err := uc.CreateCategory(ctx, params)

		require.Zero(t, id)
		require.ErrorContains(t, err, "CategoryUC.Create")
	})
}

func TestCategoryUC_UpdateCategory(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockCategoryRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewCategoryUsecase(mockRepo, log)

	category := &entity.Category{
		ID:    101,
		Title: "Updated",
	}

	t.Run("success - admin updates", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Update(ctx, category).
			Return(nil)

		err := uc.UpdateCategory(ctx, category)

		require.NoError(t, err)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		ctx := context.Background()

		err := uc.UpdateCategory(ctx, category)

		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden - not admin", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 42, "user")

		err := uc.UpdateCategory(ctx, category)

		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo returns not found", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Update(ctx, category).
			Return(customErr.ErrNotFound)

		err := uc.UpdateCategory(ctx, category)

		require.ErrorIs(t, err, ErrCategoryNotFound)
	})

	t.Run("repo returns general error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Update(ctx, category).
			Return(errors.New("db failure"))

		err := uc.UpdateCategory(ctx, category)

		require.ErrorContains(t, err, "CategoryUC.Update")
	})
}

func TestCategoryUC_DeleteCategory(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockCategoryRepository(ctrl)
	log := mocks.FakeLogger{}
	uc := NewCategoryUsecase(mockRepo, log)

	testID := int64(555)

	t.Run("success - admin deletes", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Delete(ctx, testID).
			Return(nil)

		err := uc.DeleteCategory(ctx, testID)
		require.NoError(t, err)
	})

	t.Run("unauthenticated", func(t *testing.T) {
		ctx := context.Background()

		err := uc.DeleteCategory(ctx, testID)
		require.ErrorIs(t, err, ErrUnauthenticated)
	})

	t.Run("forbidden - not admin", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 2, "user")

		err := uc.DeleteCategory(ctx, testID)
		require.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("repo returns not found", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Delete(ctx, testID).
			Return(customErr.ErrNotFound)

		err := uc.DeleteCategory(ctx, testID)
		require.ErrorIs(t, err, ErrCategoryNotFound)
	})

	t.Run("repo returns general error", func(t *testing.T) {
		ctx := auth.WithUser(context.Background(), 1, "admin")

		mockRepo.EXPECT().
			Delete(ctx, testID).
			Return(errors.New("unexpected"))

		err := uc.DeleteCategory(ctx, testID)
		require.ErrorContains(t, err, "CategoryUC.Delete")
	})
}
