package ws

import (
	"chat-service/internal/entity"
	"github.com/gorilla/websocket"
	"time"
)

type Client struct {
	Conn    *websocket.Conn
	Hub     *Hub
	TopicID int64
	Send    chan *entity.Message
}

func (c *Client) Listen() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	go c.writePump()

	// простая «пин-понг» петля, чтобы держать соединение живым
	for {
		if _, _, err := c.Conn.NextReader(); err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	for msg := range c.Send {
		c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := c.Conn.WriteJSON(msg); err != nil {
			break
		}
	}
}
