package entity

import "time"

type Topic struct {
	ID          int64     `db:"id"`
	CategoryID  int64     `db:"category_id"`
	Title       string    `db:"title"`
	Description string    `db:"description"`
	AuthorID    int64     `db:"author_id"`
	CreatedAt   time.Time `db:"created_at"`
}
