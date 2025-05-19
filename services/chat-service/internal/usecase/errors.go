package usecase

import "errors"

var (
	ErrForbidden       = errors.New("forbidden: insufficient privileges")
	ErrUnauthenticated = errors.New("unauthenticated: please log in first")
)
