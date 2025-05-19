package config

import (
	"fmt"
	"github.com/caarlos0/env/v11"
	"time"
)

type (
	// Config -.
	Config struct {
		App     App
		HTTP    HTTP
		GRPC    GRPC
		Log     Log
		PG      PG
		JWT     JWT
		Swagger Swagger
	}

	// App -.
	App struct {
		Name    string `env:"APP_NAME,required"`
		Version string `env:"APP_VERSION,required"`
	}

	// Log -.
	Log struct {
		Level string `env:"LOG_LEVEL,required"`
	}

	JWT struct {
		Secret     string        `env:"JWT_SECRET,required"`
		AccessTTL  time.Duration `env:"JWT_ACCESS_TTL,required"`  // 15m
		RefreshTTL time.Duration `env:"JWT_REFRESH_TTL,required"` // 720h (=30d)
	}

	// HTTP -.
	HTTP struct {
		Port           string `env:"HTTP_PORT,required"`
		UsePreforkMode bool   `env:"HTTP_USE_PREFORK_MODE" envDefault:"false"`
	}

	GRPC struct {
		Port string `env:"GRPC_PORT,required"`
	}

	// PG -.
	PG struct {
		PoolMax int    `env:"PG_POOL_MAX,required"`
		URL     string `env:"PG_URL,required"`
	}

	// Swagger -.
	Swagger struct {
		Enabled bool `env:"SWAGGER_ENABLED" envDefault:"false"`
	}
)

// NewConfig returns app config.
func NewConfig() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("config error: %w", err)
	}

	return cfg, nil
}
