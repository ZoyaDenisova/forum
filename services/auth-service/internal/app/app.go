package app

import (
	"auth-service/config"
	"auth-service/pkg/postgres"
	"fmt"
	"log"
)

func Run(cfg *config.Config) {
	// Repository
	pg, err := postgres.New(cfg.PG.URL, postgres.MaxPoolSize(cfg.PG.PoolMax))
	if err != nil {
		//логирование
		log.Fatalf("app - Run - postgres.New: %w", err)
	}
	defer pg.Close()

	fmt.Println("Auth-service start113")
}
