package http

import "time"

type createCategoryRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
}

type categoryResponse struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type sendMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

type updateMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// добавила имя автора, проверить ошибки
type messageResponse struct {
	ID         int64  `json:"id"`
	TopicID    int64  `json:"topic_id"`
	AuthorID   int64  `json:"author_id"`
	AuthorName string `json:"author_name"`
	Content    string `json:"content"`
	CreatedAt  int64  `json:"created_at"` // unix timestamp
}

type createTopicRequest struct {
	CategoryID  int64  `json:"category_id" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
}

type updateTopicRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
}

// добавила имя автора, проверить ошибки
type topicResponse struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	AuthorID    int64     `json:"author_id"`
	AuthorName  string    `json:"author_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type ErrorResponse struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message"`
}
