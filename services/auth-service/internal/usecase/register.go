package usecase

import (
	"auth-service/internal/entity"
	"time"
)

func NewUserFromRequest(req RegisterRequest) *entity.User {
	return &entity.User{
		Email:     req.Email,
		Name:      req.Name,
		Password:  hashPassword(req.Password),
		CreatedAt: time.Now(), // вот здесь задаётся
	}
}
