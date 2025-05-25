package http

import (
	"errors"
	"net/http"
	"strconv"

	"chat-service/internal/entity"
	"chat-service/internal/usecase"
	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	uc usecase.CategoryUsecase
}

//todo покрытие тестами

func NewCategoryHandler(uc usecase.CategoryUsecase) *CategoryHandler {
	return &CategoryHandler{uc: uc}
}

// ListCategories — GET /categories
// @Summary      List all categories
// @Description  Returns all forum categories
// @Tags         Category
// @Produce      json
// @Success      200 {array} categoryResponse
// @Failure      500 {object} ErrorResponse
// @Router       /categories [get]
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	list, err := h.uc.ListCategories(c.Request.Context())
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	resp := make([]categoryResponse, 0, len(list))
	for _, c := range list {
		resp = append(resp, categoryResponse{
			ID:          c.ID,
			Title:       c.Title,
			Description: c.Description,
		})
	}

	c.JSON(http.StatusOK, resp)
}

// GetCategory — GET /categories/{id}
// @Summary      Get category by ID
// @Description  Returns single category
// @Tags         Category
// @Produce      json
// @Param        id   path      int  true  "Category ID"
// @Success      200  {object}  categoryResponse
// @Failure      400  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /categories/{id} [get]
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}

	cat, err := h.uc.GetCategory(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrCategoryNotFound {
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, categoryResponse{
		ID:          cat.ID,
		Title:       cat.Title,
		Description: cat.Description,
	})
}

// CreateCategory — POST /categories
// @Summary      Create new category
// @Description  Adds a forum category
// @Tags         Category
// @Accept       json
// @Produce      json
// @Param        request  body      createCategoryRequest  true  "New category"
// @Success      201      {object}  categoryResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      403  {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /categories [post]
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req createCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	id, err := h.uc.CreateCategory(c.Request.Context(), usecase.CreateCategoryParams{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		switch {
		case errors.Is(err, usecase.ErrUnauthenticated):
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case errors.Is(err, usecase.ErrForbidden):
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden: insufficient privileges"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.JSON(http.StatusCreated, categoryResponse{
		ID:          id,
		Title:       req.Title,
		Description: req.Description,
	})
}

// UpdateCategory — PUT /categories/{id}
// @Summary      Update category
// @Description  Modifies an existing category
// @Tags         Category
// @Accept       json
// @Param        id       path      int                     true  "Category ID"
// @Param        request  body      createCategoryRequest  true  "Updated data"
// @Success 204
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Failure      403      {object}  ErrorResponse
// @Failure      404      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /categories/{id} [put]
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}
	var req createCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}
	err = h.uc.UpdateCategory(c.Request.Context(), &entity.Category{
		ID:          id,
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		switch {
		case errors.Is(err, usecase.ErrUnauthenticated):
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case errors.Is(err, usecase.ErrForbidden):
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden: insufficient privileges"})
		case errors.Is(err, usecase.ErrCategoryNotFound):
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteCategory — DELETE /categories/{id}
// @Summary      Delete category
// @Description  Removes a category
// @Tags         Category
// @Param        id   path      int  true  "Category ID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      403  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}

	if err := h.uc.DeleteCategory(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, usecase.ErrUnauthenticated):
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case errors.Is(err, usecase.ErrForbidden):
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden: insufficient privileges"})
		case errors.Is(err, usecase.ErrCategoryNotFound):
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
