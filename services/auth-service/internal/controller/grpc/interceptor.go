package grpc

import (
	"context"
	"fmt"
	"strings"

	"github.com/ZoyaDenisova/go-common/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type (
	ctxUserIDKey struct{}
	ctxRoleKey   struct{}
)

// AuthInterceptor валидирует Bearer-токен из metadata и кладёт userID/role в контекст
func AuthInterceptor(tokens jwt.TokenManager) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		fmt.Println(md) // map[:authority:[localhost:50051] content-type:[application/grpc] user-agent:[grpc-go/1.72.1]]

		if !ok {
			return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
		}
		vals := md["authorization"]
		fmt.Println("vals", vals) // vals []

		// err
		if len(vals) == 0 {
			return nil, status.Errorf(codes.Unauthenticated, "authorization header is required")
		}
		auth := vals[0]
		fmt.Println("auth", auth) //
		if !strings.HasPrefix(auth, "Bearer ") {
			return nil, status.Errorf(codes.Unauthenticated, "invalid auth header")
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		userID, role, err := tokens.ValidateAccess(token)
		fmt.Println("u", userID, role, err)
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "invalid token: %v", err)
		}

		newCtx := context.WithValue(ctx, ctxUserIDKey{}, userID)
		newCtx = context.WithValue(newCtx, ctxRoleKey{}, role)

		return handler(newCtx, req)
	}
}

func FromContext(ctx context.Context) (userID int64, role string) {
	if v, ok := ctx.Value(ctxUserIDKey{}).(int64); ok {
		userID = v
	}
	if r, ok := ctx.Value(ctxRoleKey{}).(string); ok {
		role = r
	}
	return
}
