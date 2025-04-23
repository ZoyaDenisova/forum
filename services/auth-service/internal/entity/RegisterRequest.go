package entity

// Структура HTTP-запроса на регистрацию пользователя
type RegisterRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
