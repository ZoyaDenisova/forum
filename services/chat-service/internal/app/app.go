package app

import (
	authpb "chat-service/cmd/app/docs/proto"
	"chat-service/config"
	httpd "chat-service/internal/controller/http"
	wsCtrl "chat-service/internal/controller/ws"
	"chat-service/internal/repo"
	"chat-service/internal/usecase"
	"context"
	"errors"
	"fmt"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/ZoyaDenisova/go-common/postgres"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func Run(cfg *config.Config) {
	// Logger
	l := logger.New(cfg.Log.Level)
	l.Info("service starting",
		zap.String("name", cfg.App.Name),
		zap.String("version", cfg.App.Version),
	)

	// Postgres
	pg, err := postgres.New(
		cfg.PG.URL,
		postgres.MaxPoolSize(cfg.PG.PoolMax),
	)
	if err != nil {
		l.Fatal("failed to init postgres", zap.Error(err))
	}
	defer pg.Close()

	// Repositories
	catRepo := repo.NewCategoryRepo(pg)
	topicRepo := repo.NewTopicRepo(pg)
	msgRepo := repo.NewMessageRepo(pg)

	// Use-cases
	hub := wsCtrl.NewHub()
	catUC := usecase.NewCategoryUsecase(catRepo)
	topicUC := usecase.NewTopicUsecase(topicRepo)
	msgUC := usecase.NewMessageUsecase(msgRepo, hub)

	authAddr := fmt.Sprintf("%s:%s", cfg.AuthGRPC.Host, cfg.AuthGRPC.Port)
	conn, err := grpc.Dial(
		authAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		l.Fatal("failed to dial auth-service", zap.String("addr", authAddr), zap.Error(err))
	}
	defer conn.Close()

	// 2) Создаём клиента
	authClient := authpb.NewAuthServiceClient(conn)

	// Router
	router := httpd.NewRouter(l, catUC, topicUC, msgUC, hub, authClient, cfg)

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
