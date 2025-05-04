package entity

import "time"

type User struct {
	ID           int64
	Name         string
	Email        string
	PasswordHash string // bcrypt-хэш
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
