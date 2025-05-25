package http

import (
	"context"
	"fmt"
	"github.com/ZoyaDenisova/go-common/contextkeys"
	"github.com/ZoyaDenisova/go-common/logger"
	"google.golang.org/grpc/metadata"
	"net/http"
	"strings"
	"time"

	authpb "chat-service/cmd/app/docs/proto"
	"github.com/gin-gonic/gin"
)

func UserIDFromCtx(ctx context.Context) (int64, string) {
	uid, _ := ctx.Value(contextkeys.UserIDKey{}).(int64)
	role, _ := ctx.Value(contextkeys.RoleKey{}).(string)
	return uid, role
}

func AuthMiddleware(authClient authpb.AuthServiceClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		const bearer = "Bearer "
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, bearer) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "missing bearer token"})
			return
		}
		token := strings.TrimPrefix(header, bearer)

		md := metadata.New(map[string]string{
			"authorization": bearer + token,
		})
		ctx := metadata.NewOutgoingContext(c.Request.Context(), md)

		fmt.Printf("outgoing jwt: value=%s\n", token) //убрать

		resp, err := authClient.VerifyToken(ctx, &authpb.VerifyTokenRequest{
			AccessToken: token,
		})
		fmt.Println("err", err)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid token"})
			return
		}

		ctx = context.WithValue(c.Request.Context(), contextkeys.UserIDKey{}, resp.UserId)
		ctx = context.WithValue(ctx, contextkeys.RoleKey{}, resp.Role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// LoggingMiddleware логирует каждый HTTP-запрос
func LoggingMiddleware(log logger.Interface) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info("HTTP request",
			"method", c.Request.Method,
			"path", c.FullPath(),
			"status", c.Writer.Status(),
			"duration", time.Since(start),
		)
	}
}
