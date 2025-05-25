package errors

import "errors"

var (
	// ErrNotFound возвращается, когда нужный ресурс не найден в хранилище.
	ErrNotFound = errors.New("not found")

	//// ErrExpiredToken возвращается, когда токен существует, но просрочен.
	//ErrExpiredToken = errors.New("token expired")
	//
	//// ErrConflict возвращается при попытке создать ресурс, который уже существует (уникальные поля нарушены).
	//ErrConflict = errors.New("conflict")
)
