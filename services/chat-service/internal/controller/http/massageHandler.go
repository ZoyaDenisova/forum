package http

import (
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

// GetMessages — GET /topics/{topicId}/messages
// @Summary      List messages
// @Description  Returns all messages in a topic
// @Tags         Message
// @Produce      json
// @Param        topicId  path      int  true  "Topic ID"
// @Success      200      {array}   messageResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Router       /topics/{topicId}/messages [get]
func (h *MessageHandler) GetMessages(c *gin.Context) {
	tid, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid topic id"})
		return
	}
	list, err := h.uc.GetMessages(c.Request.Context(), tid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}
	resp := make([]messageResponse, 0, len(list))
	for _, m := range list {
		resp = append(resp, messageResponse{
			ID:        m.ID,
			TopicID:   m.TopicID,
			AuthorID:  m.AuthorID,
			Content:   m.Content,
			CreatedAt: m.CreatedAt.Unix(),
		})
	}
	c.JSON(http.StatusOK, resp)
}

// SendMessage — POST /topics/{topicId}/messages
// @Summary      Send message
// @Description  Creates a new message in topic
// @Tags         Message
// @Accept       json
// @Produce      json
// @Param        topicId  path      int                true  "Topic ID"
// @Param        request  body      sendMessageRequest  true  "Message text"
// @Success      201      {object}  messageResponse
// @Failure      400      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /topics/{topicId}/messages [post]
func (h *MessageHandler) SendMessage(c *gin.Context) {
	tid, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid topic id"})
		return
	}
	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}
	authorID, _ := UserIDFromCtx(c.Request.Context())
	err = h.uc.SendMessage(c.Request.Context(), usecase.SendMessageParams{
		TopicID:  tid,
		AuthorID: authorID,
		Content:  req.Content,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}
	// возвращаем тот же объект
	c.JSON(http.StatusCreated, messageResponse{
		TopicID:   tid,
		AuthorID:  authorID,
		Content:   req.Content,
		CreatedAt: 0, // клиенту достаточно WS-обновления
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
// @Success      204      {string}  string                 "No Content"
// @Failure      400      {object}  ErrorResponse
// @Failure      404      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /messages/{id} [put]
func (h *MessageHandler) UpdateMessage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid message id"})
		return
	}
	var req updateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}
	if err := h.uc.UpdateMessage(c.Request.Context(), id, req.Content); err != nil {
		switch err {
		case usecase.ErrMessageNotFound:
			c.JSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
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
// @Success      204  {string}  string  "No Content"
// @Failure      400  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /messages/{id} [delete]
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid message id"})
		return
	}
	if err := h.uc.DeleteMessage(c.Request.Context(), id); err != nil {
		switch err {
		case usecase.ErrMessageNotFound:
			c.JSON(http.StatusNotFound, ErrorResponse{Message: err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		}
		return
	}
	c.Status(http.StatusNoContent)
}
