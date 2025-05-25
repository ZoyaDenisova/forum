package ws

import (
	"sync"

	"chat-service/internal/entity"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*Client]struct{})}
}

// Register добавляет клиента в рассылку
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c] = struct{}{}
}

// Unregister удаляет клиента
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, c)
	close(c.Send)
}

// Publish рассылает сообщение всем клиентам, подписанным на topicID
func (h *Hub) Publish(topicID int64, ev *entity.WSEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.TopicID == topicID {
			select {
			case c.Send <- ev:
			default:
			}
		}
	}
}
