package usecase

import (
	"chat-service/internal/auth"
	"chat-service/internal/entity"
	repoErr "chat-service/internal/errors"
	"chat-service/internal/repo"
	"context"
	"errors"
	"fmt"
	"github.com/ZoyaDenisova/go-common/logger"
)

var (
	ErrCategoryNotFound = errors.New("category not found")
)

type CategoryUC struct {
	repo repo.CategoryRepository
	log  logger.Interface
}

func NewCategoryUsecase(r repo.CategoryRepository, l logger.Interface) *CategoryUC {
	return &CategoryUC{repo: r, log: l}
}

// ListCategories возвращает все категории
func (uc *CategoryUC) ListCategories(ctx context.Context) ([]*entity.Category, error) {
	uc.log.Debug("CategoryUC.ListCategories called")

	cats, err := uc.repo.GetAll(ctx)
	if err != nil {
		uc.log.Error("repo.GetAll failed", "err", err)
		return nil, fmt.Errorf("CategoryUC.List: %w", err)
	}

	if len(cats) == 0 {
		uc.log.Warn("no categories found")
	} else {
		uc.log.Info("categories retrieved", "count", len(cats))
	}

	return cats, nil
}

// GetCategory возвращает категорию по ID
func (uc *CategoryUC) GetCategory(ctx context.Context, id int64) (*entity.Category, error) {
	uc.log.Debug("CategoryUC.GetCategory called", "id", id)

	c, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repoErr.ErrNotFound) {
			uc.log.Info("category not found", "id", id)
			return nil, ErrCategoryNotFound
		}
		uc.log.Error("repo.GetByID failed", "err", err)
		return nil, fmt.Errorf("CategoryUC.Get: %w", err)
	}

	uc.log.Info("category retrieved", "id", c.ID, "title", c.Title)
	return c, nil
}

func (uc *CategoryUC) CreateCategory(ctx context.Context, p CreateCategoryParams) (int64, error) {
	uc.log.Debug("CreateCategory called", "title", p.Title)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to create category")
		return 0, ErrUnauthenticated
	}
	if role != "admin" {
		uc.log.Warn("unauthorized role tried to create category", "role", role)
		return 0, ErrForbidden
	}

	c := &entity.Category{
		Title:       p.Title,
		Description: p.Description,
	}

	if err := uc.repo.Create(ctx, c); err != nil {
		uc.log.Error("repo.Create failed", "err", err)
		return 0, fmt.Errorf("CategoryUC.Create: %w", err)
	}

	uc.log.Info("category created", "id", c.ID, "title", c.Title)
	return c.ID, nil
}

func (uc *CategoryUC) UpdateCategory(ctx context.Context, c *entity.Category) error {
	uc.log.Debug("UpdateCategory called", "id", c.ID, "title", c.Title)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to update category")
		return ErrUnauthenticated
	}
	if role != "admin" {
		uc.log.Warn("unauthorized role tried to update category", "role", role)
		return ErrForbidden
	}

	err := uc.repo.Update(ctx, c)
	switch {
	case errors.Is(err, repoErr.ErrNotFound):
		uc.log.Info("category not found during update", "id", c.ID)
		return ErrCategoryNotFound
	case err != nil:
		uc.log.Error("repo.Update failed", "err", err)
		return fmt.Errorf("CategoryUC.Update: %w", err)
	default:
		uc.log.Info("category updated", "id", c.ID)
		return nil
	}
}

func (uc *CategoryUC) DeleteCategory(ctx context.Context, id int64) error {
	uc.log.Debug("DeleteCategory called", "id", id)

	userID, role := auth.FromContext(ctx)
	if userID == 0 {
		uc.log.Warn("unauthenticated user tried to delete category")
		return ErrUnauthenticated
	}
	if role != "admin" {
		uc.log.Warn("unauthorized role tried to delete category", "role", role)
		return ErrForbidden
	}

	err := uc.repo.Delete(ctx, id)
	switch {
	case errors.Is(err, repoErr.ErrNotFound):
		uc.log.Info("category not found during delete", "id", id)
		return ErrCategoryNotFound
	case err != nil:
		uc.log.Error("repo.Delete failed", "err", err)
		return fmt.Errorf("CategoryUC.Delete: %w", err)
	default:
		uc.log.Info("category deleted", "id", id)
		return nil
	}
}
