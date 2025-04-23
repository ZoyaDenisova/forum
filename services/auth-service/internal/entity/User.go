package entity

import "time"

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"password"` //todo поработать над сериализацией
	CreatedAt time.Time `json:"created_at"`
}
