package entity

import "time"

type Session struct {
	ID           int64
	UserID       int64
	RefreshToken string
	UserAgent    string
	IPAddress    string
	CreatedAt    time.Time
	ExpiresAt    time.Time
	LastUsedAt   *time.Time // nil, если ещё не использовалась
}
