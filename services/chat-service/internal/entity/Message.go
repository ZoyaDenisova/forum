package entity

import "time"

type Message struct {
	ID         int64     `db:"id"         json:"id"`
	TopicID    int64     `db:"topic_id"   json:"topic_id"`
	AuthorID   int64     `db:"author_id"  json:"author_id"`
	AuthorName string    `db:"author_name" json:"author_name"`
	Content    string    `db:"content"    json:"content"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}
