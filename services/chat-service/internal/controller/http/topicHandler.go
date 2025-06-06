package http

import (
	"chat-service/internal/auth"
	"net/http"
	"strconv"
	"time"

	"chat-service/internal/usecase"
	"github.com/gin-gonic/gin"
)

type TopicHandler struct {
	uc usecase.TopicUsecase
}

func NewTopicHandler(uc usecase.TopicUsecase) *TopicHandler {
	return &TopicHandler{uc: uc}
}

// ListTopics — GET /categories/{id}/topics
// @Summary      List topics in category
// @Description  Returns all topics under a given category
// @Tags         Topic
// @Produce      json
// @Param        id   path      int  true  "Category ID"
// @Success      200  {array}   topicResponse
// @Failure      400  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /categories/{id}/topics [get]
func (h *TopicHandler) ListTopics(c *gin.Context) {
	cid, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid category id"})
		return
	}

	list, err := h.uc.ListTopics(c.Request.Context(), cid)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	resp := make([]topicResponse, 0, len(list))
	for _, t := range list {
		resp = append(resp, topicResponse{
			ID:          t.ID,
			CategoryID:  t.CategoryID,
			Title:       t.Title,
			Description: t.Description,
			AuthorID:    t.AuthorID,
			AuthorName:  t.AuthorName,
			CreatedAt:   t.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

// GetTopic — GET /topics/{id}
// @Summary      Get topic by ID
// @Description  Returns a single topic
// @Tags         Topic
// @Produce      json
// @Param        id   path      int  true  "Topic ID"
// @Success      200  {object}  topicResponse
// @Failure      400  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /topics/{id} [get]
func (h *TopicHandler) GetTopic(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}

	t, err := h.uc.GetTopic(c.Request.Context(), id)
	if err != nil {
		switch err {
		case usecase.ErrTopicNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, topicResponse{
		ID:          t.ID,
		CategoryID:  t.CategoryID,
		Title:       t.Title,
		Description: t.Description,
		AuthorID:    t.AuthorID,
		AuthorName:  t.AuthorName,
		CreatedAt:   t.CreatedAt,
	})
}

// CreateTopic — POST /topics
// @Summary      Create new topic
// @Description  Adds a topic under a category
// @Tags         Topic
// @Accept       json
// @Produce      json
// @Param        request  body      createTopicRequest  true  "New topic"
// @Success      201      {object}  topicResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Failure      403      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /topics [post]
func (h *TopicHandler) CreateTopic(c *gin.Context) {
	var req createTopicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}
	authorID, _ := auth.FromContext(c.Request.Context())

	id, err := h.uc.CreateTopic(c.Request.Context(), usecase.TopicParams{
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		AuthorID:    authorID,
	})
	if err != nil {
		switch err {
		case usecase.ErrUnauthenticated:
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case usecase.ErrForbidden:
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	now := time.Now().UTC()

	c.JSON(http.StatusCreated, topicResponse{
		ID:          id,
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		AuthorID:    authorID,
		CreatedAt:   now,
	})
}

// UpdateTopic — PUT /topics/{id}
// @Summary      Update topic
// @Description  Modifies an existing topic
// @Tags         Topic
// @Accept       json
// @Produce      json
// @Param        id       path      int                  true  "Topic ID"
// @Param        request  body      updateTopicRequest  true  "Updated data"
// @Success      200      {object}  map[string]int64     "Updated topic ID"
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Failure      403      {object}  ErrorResponse
// @Failure      404      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /topics/{id} [put]
func (h *TopicHandler) UpdateTopic(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}

	var req updateTopicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	updatedID, err := h.uc.UpdateTopic(c.Request.Context(), id, usecase.TopicParams{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		switch err {
		case usecase.ErrUnauthenticated:
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case usecase.ErrForbidden:
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden"})
		case usecase.ErrTopicNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: "topic not found"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": updatedID})
}

// DeleteTopic — DELETE /topics/{id}
// @Summary      Delete topic
// @Description  Removes a topic
// @Tags         Topic
// @Param        id   path      int  true  "Topic ID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      403  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /topics/{id} [delete]
func (h *TopicHandler) DeleteTopic(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid id"})
		return
	}

	err = h.uc.DeleteTopic(c.Request.Context(), id)
	if err != nil {
		switch err {
		case usecase.ErrUnauthenticated:
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case usecase.ErrForbidden:
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden"})
		case usecase.ErrTopicNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: "topic not found"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
