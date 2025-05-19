package entity

import "time"

type User struct {
	ID           int64
	Name         string
	Email        string
	PasswordHash string // bcrypt-хэш
	Role         string
	CreatedAt    time.Time
}
