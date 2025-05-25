package http

import (
	"context"
	"github.com/ZoyaDenisova/go-common/contextkeys"
	"net/http"
	"strings"
	"time"

	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/gin-gonic/gin"
)

// UserIDFromCtx возвращает userID и роль из контекста
func UserIDFromCtx(ctx context.Context) (int64, string) {
	uid, _ := ctx.Value(contextkeys.UserIDKey{}).(int64)
	role, _ := ctx.Value(contextkeys.RoleKey{}).(string)
	return uid, role
}

// AuthMiddleware проверяет Bearer токен и кладёт userID/role в контекст
func AuthMiddleware(tm jwt.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		const bearer = "Bearer "
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, bearer) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "missing bearer token"})
			return
		}
		token := strings.TrimPrefix(h, bearer)
		uid, role, err := tm.ValidateAccess(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{Message: "invalid token"})
			return
		}
		ctx := context.WithValue(c.Request.Context(), contextkeys.UserIDKey{}, uid)
		ctx = context.WithValue(ctx, contextkeys.RoleKey{}, role)
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
