package app

import (
	authpb "chat-service/cmd/app/docs/proto"
	"chat-service/config"
	httpd "chat-service/internal/controller/http"
	wsCtrl "chat-service/internal/controller/ws"
	cronjob "chat-service/internal/cron"
	"chat-service/internal/repo"
	"chat-service/internal/usecase"
	"context"
	"errors"
	"fmt"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/ZoyaDenisova/go-common/postgres"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
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
	catRepo := repo.NewCategoryRepo(pg)
	topicRepo := repo.NewTopicRepo(pg)
	msgRepo := repo.NewMessageRepo(pg)

	// Use-cases
	hub := wsCtrl.NewHub()
	catUC := usecase.NewCategoryUsecase(catRepo, l)
	topicUC := usecase.NewTopicUsecase(topicRepo, l)
	msgUC := usecase.NewMessageUsecase(msgRepo, hub, l)

	cleanupCron := cronjob.NewCleanupCron(l, msgUC)
	cleanupCron.Start(cfg.Cleanup.Cron, cfg.Cleanup.HoursAgo)

	// gRPC auth-service connection
	authAddr := fmt.Sprintf("%s:%s", cfg.AuthGRPC.Host, cfg.AuthGRPC.Port)
	conn, err := grpc.NewClient(
		authAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		// При необходимости можно задать параметры reconnection/backoff:
		grpc.WithConnectParams(grpc.ConnectParams{
			MinConnectTimeout: 5 * time.Second,
			// Backoff:           backoff.DefaultConfig, // при желании кастомизируете
		}),
	)
	if err != nil {
		l.Fatal("failed to create auth-service client", "addr", authAddr, "err", err)
	}
	defer func(conn *grpc.ClientConn) {
		err := conn.Close()
		if err != nil {

		}
	}(conn)

	// 2. (Опционально) можно явно инициировать соединение и дождаться Ready-состояния:
	dialCtx, dialCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer dialCancel()
	conn.Connect() // не блокирует, но начинает попытку
	for {
		if conn.GetState() == connectivity.Ready {
			l.Info("gRPC connection to auth-service is ready")
			break
		}
		if dialCtx.Err() != nil {
			l.Fatal("timeout waiting for auth-service connection", "err", dialCtx.Err())
		}
		time.Sleep(50 * time.Millisecond)
	}

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

	// Run server
	go func() {
		l.Info("HTTP listening", "port", cfg.HTTP.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			l.Fatal("listen failed", "err", err)
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
		l.Error("graceful shutdown failed", "err", err)
	} else {
		l.Info("server stopped gracefully")
	}
}
