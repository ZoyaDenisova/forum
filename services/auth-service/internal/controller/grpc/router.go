package grpc

import (
	authpb "auth-service/cmd/app/docs/proto"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func NewRouter(log logger.Interface, tm jwt.TokenManager) *grpc.Server {
	// UnaryInterceptor для аутентификации (из interceptor.go)
	opts := []grpc.ServerOption{
		grpc.UnaryInterceptor(AuthInterceptor(tm)),
	}

	srv := grpc.NewServer(opts...)

	authpb.RegisterAuthServiceServer(srv, NewAuthServer())

	reflection.Register(srv)

	log.Info("gRPC router initialized")
	return srv
}
