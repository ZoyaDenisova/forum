// @title       Chat Service API
// @version     1.0
// @description Сервис чата на WebSocket и Swagger UI.

// @host        localhost:8081
// @BasePath    /
// @schemes     http

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
package main

import (
	_ "chat-service/cmd/app/docs"
	"chat-service/config"
	"chat-service/internal/app"
	_ "github.com/joho/godotenv/autoload"
	"log"
)

//swag init -g ./cmd/app/main.go --parseInternal --output ./cmd/app/docs
//генерирует сваггер (из корня проекта)

//mockgen -source=C:/Users/user/GolandProjects/forum/services/chat-service/internal/repo/contracts.go `
//        -destination=C:/Users/user/GolandProjects/forum/services/chat-service/internal/usecase/mocks/repo_mocks.go `
//        -package=mocks
//моки

func main() {
	// Configuration
	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("Config error: %s", err)
	}

	// Run
	app.Run(cfg)
	//Если ентити не соответствует бд (оно и не обязательно должно соответствовать)- просто делаем дто.
	//Проверка емейла - если строка не равна нулю - тогда у нас уже пользователь существует с таким аккаунтом.
	//Контроллер вызывает по порядку юскейсы.
}
