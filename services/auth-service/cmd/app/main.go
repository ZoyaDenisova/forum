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
}
