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
	Send    chan *entity.WSEvent
}

func (c *Client) Listen() {
	defer func() {
		c.Hub.Unregister(c)
		err := c.Conn.Close()
		if err != nil {
			return
		}
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
	for ev := range c.Send {
		err := c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err != nil {
			return
		}
		if err := c.Conn.WriteJSON(ev); err != nil {
			break
		}
	}
}
