package main

import (
	"auth-service/config"
	"auth-service/internal/app"
	_ "github.com/joho/godotenv/autoload"
	"log"
)

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
