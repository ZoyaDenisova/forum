package transportgrpc

import (
	authpb "auth-service/cmd/app/docs/proto"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func NewRouter(log logger.Interface, tm jwt.TokenManager) *grpc.Server {
	// UnaryInterceptor для аутентификации (из interceptor.go)
	authInterceptor := NewAuthInterceptor(tm, log)

	opts := []grpc.ServerOption{
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	}

	srv := grpc.NewServer(opts...)

	authpb.RegisterAuthServiceServer(srv, NewAuthServer(log))

	reflection.Register(srv)

	log.Info("gRPC router initialized")
	return srv
}
