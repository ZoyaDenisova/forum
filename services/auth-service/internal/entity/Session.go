package entity

import "time"

type Session struct {
	ID           int64
	UserID       int64
	RefreshToken string
	UserAgent    string
	CreatedAt    time.Time
	ExpiresAt    time.Time
}
