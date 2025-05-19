package entity

import "time"

type Message struct {
	ID        int64     `db:"id"`
	TopicID   int64     `db:"topic_id"`
	AuthorID  int64     `db:"author_id"`
	Content   string    `db:"content"`
	CreatedAt time.Time `db:"created_at"`
}
