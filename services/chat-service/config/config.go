package config

import (
	"fmt"
	"github.com/caarlos0/env/v11"
)

type (
	// Config -.
	Config struct {
		App      App
		HTTP     HTTP
		Log      Log
		PG       PG
		Swagger  Swagger
		AuthGRPC AuthGRPC
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

	// HTTP -.
	HTTP struct {
		Port           string `env:"HTTP_PORT,required"`
		UsePreforkMode bool   `env:"HTTP_USE_PREFORK_MODE" envDefault:"false"`
	}

	// AuthGRPC хранит адрес auth-сервиса для gRPC
	AuthGRPC struct {
		Host string `env:"AUTH_GRPC_HOST,required"` // например "localhost" или DNS-имя k8s-сервиса
		Port string `env:"AUTH_GRPC_PORT,required"` // например "50051"
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
