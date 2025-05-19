package http

import (
	"context"
	"fmt"
	"google.golang.org/grpc/metadata"
	"net/http"
	"strings"

	authpb "chat-service/cmd/app/docs/proto"
	"github.com/gin-gonic/gin"
)

type (
	ctxUserIDKey struct{}
	ctxRoleKey   struct{}
)

func UserIDFromCtx(ctx context.Context) (int64, string) {
	uid, _ := ctx.Value(ctxUserIDKey{}).(int64)
	role, _ := ctx.Value(ctxRoleKey{}).(string)
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

		resp, err := authClient.VerifyToken(ctx, &authpb.VerifyTokenRequest{
			AccessToken: token,
		})
		fmt.Println("err", err)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid token"})
			return
		}

		ctx = context.WithValue(c.Request.Context(), ctxUserIDKey{}, resp.UserId)
		ctx = context.WithValue(ctx, ctxRoleKey{}, resp.Role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
