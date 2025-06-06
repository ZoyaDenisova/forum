package app

import (
	"auth-service/config"
	httpd "auth-service/internal/controller/http"
	"auth-service/internal/controller/transportgrpc"
	"auth-service/internal/cron"
	"auth-service/internal/repo"
	"auth-service/internal/usecase"
	"context"
	"errors"
	"github.com/ZoyaDenisova/go-common/hasher"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/ZoyaDenisova/go-common/postgres"
	"go.uber.org/zap"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// todo в юскейсах добавить логирование
func Run(cfg *config.Config) {
	// Logger
	l := logger.New(cfg.Log.Level)
	l.Info("service starting",
		"name", cfg.App.Name,
		"version", cfg.App.Version,
	)

	// Postgres
	pg, err := postgres.New(
		cfg.PG.URL,
		postgres.MaxPoolSize(cfg.PG.PoolMax),
	)
	if err != nil {
		l.Fatal("failed to init postgres", "err", err)
	}
	defer pg.Close()

	// Repositories
	userRepo := repo.NewUserRepo(pg)
	sessRepo := repo.NewSessionRepo(pg)

	// Services
	hasherSvc := hasher.NewHasher()
	tokens := jwt.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessTTL,
		cfg.JWT.RefreshTTL,
	)

	// Use-cases
	userUC := usecase.NewUserUsecase(userRepo, sessRepo, hasherSvc, tokens, l)
	sessUC := usecase.NewSessionUsecase(sessRepo, userRepo, tokens, l)

	// Router
	router := httpd.NewRouter(l, userUC, sessUC, tokens, cfg)

	// Cron
	cron := cron.NewSessionCleanupCron(l, sessUC)
	if err := cron.Start(cfg.SessionCleanupCron.Schedule); err != nil {
		l.Fatal("cron startup failed", "err", err)
	}

	// HTTP Server
	srv := &http.Server{
		Addr:         ":" + cfg.HTTP.Port,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  15 * time.Second,
	}

	// Run
	go func() {
		l.Info("HTTP listening", zap.String("port", cfg.HTTP.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			l.Fatal("listen failed", zap.Error(err))
		}
	}()

	grpcSrv := transportgrpc.NewRouter(l, tokens)

	addr := ":" + cfg.GRPC.Port // фикс

	lis, err := net.Listen("tcp", addr)
	if err != nil {
		l.Fatal("failed to listen gRPC", zap.Error(err))
	}
	l.Info("starting gRPC server", zap.String("addr", addr))

	if err := grpcSrv.Serve(lis); err != nil {
		l.Fatal("gRPC server error", zap.Error(err))
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	l.Info("shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		l.Error("graceful shutdown failed", zap.Error(err))
	} else {
		l.Info("server stopped gracefully")
	}
}
