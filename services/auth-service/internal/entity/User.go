package entity

import "time"

type User struct {
	ID           int64
	Name         string
	Email        string
	PasswordHash string // bcrypt-хэш
	Role         string
	IsBlocked    bool
	CreatedAt    time.Time
}
