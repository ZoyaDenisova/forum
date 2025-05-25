package transportgrpc

import (
	"context"
	"github.com/ZoyaDenisova/go-common/contextkeys"
	"github.com/ZoyaDenisova/go-common/logger"
	"strings"

	"github.com/ZoyaDenisova/go-common/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type AuthInterceptor struct {
	tokens jwt.TokenManager
	logger logger.Interface
}

func NewAuthInterceptor(tokens jwt.TokenManager, log logger.Interface) *AuthInterceptor {
	return &AuthInterceptor{
		tokens: tokens,
		logger: log,
	}
}

// AuthInterceptor валидирует Bearer-токен из metadata и кладёт userID/role в контекст
func (i *AuthInterceptor) Unary() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			i.logger.Warn("missing metadata in context")
			return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
		}

		i.logger.Debug("incoming metadata: %+v", md)

		vals := md["authorization"]
		if len(vals) == 0 {
			i.logger.Warn("authorization header is missing")
			return nil, status.Errorf(codes.Unauthenticated, "authorization header is required")
		}

		auth := vals[0]
		i.logger.Debug("authorization header", "value", auth)

		if !strings.HasPrefix(auth, "Bearer ") {
			i.logger.Warn("invalid auth header format: %s", auth)
			return nil, status.Errorf(codes.Unauthenticated, "invalid auth header")
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		userID, role, err := i.tokens.ValidateAccess(token)
		if err != nil {
			i.logger.Error("token validation failed: %v", err)
			return nil, status.Errorf(codes.Unauthenticated, "invalid token: %v", err)
		}

		i.logger.Debug("token validated: userID=%s role=%s", userID, role)

		newCtx := context.WithValue(ctx, contextkeys.UserIDKey{}, userID)
		newCtx = context.WithValue(newCtx, contextkeys.RoleKey{}, role)

		return handler(newCtx, req)
	}
}

func FromContext(ctx context.Context) (userID int64, role string) {
	if v, ok := ctx.Value(contextkeys.UserIDKey{}).(int64); ok {
		userID = v
	}
	if r, ok := ctx.Value(contextkeys.RoleKey{}).(string); ok {
		role = r
	}
	return
}
