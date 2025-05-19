// @title           Auth API
// @version         1.0
// @description     This is the authentication service API.
// @host      localhost:8080
// @BasePath  /
// @schemes http
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
package main

import (
	_ "auth-service/cmd/app/docs"
	"auth-service/config"
	"auth-service/internal/app"
	_ "github.com/joho/godotenv/autoload"
	"log"
)

//swag init -g ./cmd/app/main.go --parseInternal --output ./cmd/app/docs
//генерирует сваггер (из корня проекта)

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
