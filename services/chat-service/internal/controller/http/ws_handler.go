package http

import (
	"chat-service/internal/entity"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"chat-service/internal/controller/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSHandler struct {
	Hub *ws.Hub
}

func NewWSHandler(h *ws.Hub) *WSHandler {
	return &WSHandler{Hub: h}
}

// ServeWS — GET /ws/topics/{topicId}
// @Summary      WebSocket for real-time chat
// @Description  Subscribes to live messages in a topic
// @Tags         WebSocket
// @Param        topicId  path      int  true  "Topic ID"
// @Success      101      {string}  string  "Switching Protocols"
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /ws/topics/{topicId} [get]
func (h *WSHandler) ServeWS(c *gin.Context) {
	// проверка авторизации не обязательна для чтения, но нужна для идентификации
	userID, _ := UserIDFromCtx(c.Request.Context())
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "unauthorized"})
		return
	}

	tid, err := strconv.ParseInt(c.Param("topicId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid topic id"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &ws.Client{
		Conn:    conn,
		Hub:     h.Hub,
		TopicID: tid,
		Send:    make(chan *entity.Message, 32),
	}
	h.Hub.Register(client)
	client.Listen()
}
