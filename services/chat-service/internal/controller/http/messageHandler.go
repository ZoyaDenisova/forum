package http

import (
	"errors"
	"net/http"
	"strconv"

	"chat-service/internal/usecase"
	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	uc usecase.MessageUsecase
}

func NewMessageHandler(uc usecase.MessageUsecase) *MessageHandler {
	return &MessageHandler{uc: uc}
}

// GetMessages — GET /topics/{id}/messages
// @Summary      List messages
// @Description  Returns all messages in a topic
// @Tags         Message
// @Produce      json
// @Param        id  path      int  true  "Topic ID"
// @Success      200      {array}   messageResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Router       /topics/{id}/messages [get]
func (h *MessageHandler) GetMessages(c *gin.Context) {
	tid, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid topic id"})
		return
	}

	list, err := h.uc.GetMessages(c.Request.Context(), tid)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	resp := make([]messageResponse, 0, len(list))
	for _, m := range list {
		resp = append(resp, messageResponse{
			ID:         m.ID,
			TopicID:    m.TopicID,
			AuthorID:   m.AuthorID,
			AuthorName: m.AuthorName, // добавлено
			Content:    m.Content,
			CreatedAt:  m.CreatedAt.Unix(),
		})
	}

	c.JSON(http.StatusOK, resp)
}

// SendMessage — POST /topics/{id}/messages
// @Summary      Send message
// @Description  Creates a new message in topic
// @Tags         Message
// @Accept       json
// @Produce      json
// @Param        id       path      int                 true  "Topic ID"
// @Param        request  body      sendMessageRequest  true  "Message text"
// @Success      201      {object}  messageResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /topics/{id}/messages [post]
func (h *MessageHandler) SendMessage(c *gin.Context) {
	tid, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid topic id"})
		return
	}

	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	authorID, _ := UserIDFromCtx(c.Request.Context())

	msg, err := h.uc.SendMessage(c.Request.Context(), usecase.SendMessageParams{
		TopicID:  tid,
		AuthorID: authorID,
		Content:  req.Content,
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

	c.JSON(http.StatusCreated, messageResponse{
		ID:         msg.ID,
		TopicID:    msg.TopicID,
		AuthorID:   msg.AuthorID,
		AuthorName: msg.AuthorName, // будет "", если не наполняли — это ок
		Content:    msg.Content,
		CreatedAt:  msg.CreatedAt.Unix(),
	})
}

// UpdateMessage — PUT /messages/{id}
// @Summary      Update message
// @Description  Changes text of a message
// @Tags         Message
// @Accept       json
// @Produce      json
// @Param        id       path      int                    true  "Message ID"
// @Param        request  body      updateMessageRequest  true  "New content"
// @Success      204
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse  "Unauthorized"
// @Failure      403      {object}  ErrorResponse  "Forbidden"
// @Failure      404      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /messages/{id} [put]
func (h *MessageHandler) UpdateMessage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid message id"})
		return
	}

	var req updateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	err = h.uc.UpdateMessage(c.Request.Context(), id, req.Content)
	if err != nil {
		switch err {
		case usecase.ErrUnauthenticated:
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case usecase.ErrForbidden:
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden"})
		case usecase.ErrMessageNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: "message not found"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteMessage — DELETE /messages/{id}
// @Summary      Delete message
// @Description  Removes a message
// @Tags         Message
// @Param        id   path      int  true  "Message ID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse  "Unauthorized"
// @Failure      403  {object}  ErrorResponse  "Forbidden"
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /messages/{id} [delete]
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: "invalid message id"})
		return
	}

	err = h.uc.DeleteMessage(c.Request.Context(), id)
	if err != nil {
		switch err {
		case usecase.ErrUnauthenticated:
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthenticated"})
		case usecase.ErrForbidden:
			c.AbortWithStatusJSON(http.StatusForbidden, ErrorResponse{Message: "forbidden"})
		case usecase.ErrMessageNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{Message: "message not found"})
		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
