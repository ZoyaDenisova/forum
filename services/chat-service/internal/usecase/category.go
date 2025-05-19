package usecase

import (
	"chat-service/internal/auth"
	"context"
	"errors"
	"fmt"

	"chat-service/internal/entity"
	repoErr "chat-service/internal/errors"
	"chat-service/internal/repo"
)

var (
	ErrCategoryNotFound = errors.New("category not found")
)

type CategoryUsecase struct {
	repo repo.CategoryRepository
}

func NewCategoryUsecase(r repo.CategoryRepository) CategoryUsecase {
	return CategoryUsecase{repo: r}
}

// ListCategories возвращает все категории
func (uc *CategoryUsecase) ListCategories(ctx context.Context) ([]*entity.Category, error) {
	cats, err := uc.repo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("CategoryUsecase.List: %w", err)
	}
	return cats, nil
}

// GetCategory возвращает категорию по ID
func (uc *CategoryUsecase) GetCategory(ctx context.Context, id int64) (*entity.Category, error) {
	c, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repoErr.ErrNotFound) {
			return nil, ErrCategoryNotFound
		}
		return nil, fmt.Errorf("CategoryUsecase.Get: %w", err)
	}
	return c, nil
}

func (uc *CategoryUsecase) CreateCategory(ctx context.Context, p CreateCategoryParams) (int64, error) {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return 0, ErrUnauthenticated
	}
	if role != "admin" {
		return 0, ErrForbidden
	}
	c := &entity.Category{
		Title:       p.Title,
		Description: p.Description,
	}
	if err := uc.repo.Create(ctx, c); err != nil {
		return 0, fmt.Errorf("CategoryUsecase.Create: %w", err)
	}
	return c.ID, nil
}

func (uc *CategoryUsecase) UpdateCategory(ctx context.Context, c *entity.Category) error {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return ErrUnauthenticated
	}
	if role != "admin" {
		return ErrForbidden
	}
	if err := uc.repo.Update(ctx, c); errors.Is(err, repoErr.ErrNotFound) {
		return ErrCategoryNotFound
	} else if err != nil {
		return fmt.Errorf("CategoryUsecase.Update: %w", err)
	}
	return nil
}

func (uc *CategoryUsecase) DeleteCategory(ctx context.Context, id int64) error {
	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		return ErrUnauthenticated
	}
	if role != "admin" {
		return ErrForbidden
	}
	if err := uc.repo.Delete(ctx, id); errors.Is(err, repoErr.ErrNotFound) {
		return ErrCategoryNotFound
	} else if err != nil {
		return fmt.Errorf("CategoryUsecase.Delete: %w", err)
	}
	return nil
}
