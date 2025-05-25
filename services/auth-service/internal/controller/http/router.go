// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package http

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	_ "auth-service/cmd/app/docs"
	"auth-service/config"
	"auth-service/internal/usecase"
	"github.com/ZoyaDenisova/go-common/jwt"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// NewRouter настраивает маршруты, middleware и Swagger
func NewRouter(
	log logger.Interface,
	u usecase.User,
	s usecase.Session,
	tm jwt.TokenManager,
	cfg *config.Config,
) http.Handler {
	r := gin.New()

	// middlewares
	r.Use(LoggingMiddleware(log))
	r.Use(gin.Recovery())
	//r.Use(cors.New(cors.Config{
	//	AllowOrigins:     []string{"http://localhost:5173"},
	//	AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
	//	AllowHeaders:     []string{"Authorization", "Content-Type"},
	//	AllowCredentials: true,
	//}))

	// Swagger UI
	if cfg.Swagger.Enabled {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// init handler
	h := NewHandler(log, u, s, cfg)

	corsConfig := cors.Config{
		// Явный список origins (нужен, чтобы gin-contrib не ругался на AllowCredentials с "*")
		AllowOrigins: []string{
			"http://172.20.10.2:5173",
			"http://localhost:5173",
		},

		// Функция, которая дополнительно разрешит любые origin из подсегмента 192.168.1.*:5173
		AllowOriginFunc: func(origin string) bool {
			u, err := url.Parse(origin)
			if err != nil {
				return false
			}
			host := u.Hostname()
			return strings.HasPrefix(host, "172.20.1.") || strings.HasPrefix(host, "localhost")
		},

		// Какие методы разрешаем
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},

		// Какие заголовки клиент может слать
		AllowHeaders: []string{
			"Authorization", "Content-Type",
		},

		// Какие заголовки браузеру можно «читать»
		ExposeHeaders: []string{
			"Content-Length",
		},

		// Требуется, чтобы браузер слал Cookie и Authorization
		AllowCredentials: true,

		// Кэшировать preflight-запросы до 12 часов
		MaxAge: 12 * time.Hour,
	}
	// Включаем CORS middleware
	r.Use(cors.New(corsConfig))
	{
		// PUBLIC
		r.POST("/auth/register", h.Register)
		r.POST("/auth/login", h.Login)
		r.POST("/auth/refresh", h.Refresh)

		// PROTECTED
		secured := r.Group("/users")
		secured.Use(AuthMiddleware(tm))
		{
			secured.POST("/:id/block", h.BlockUser)
			secured.POST("/:id/unblock", h.UnblockUser)
		}

		securedAuth := r.Group("/auth")
		securedAuth.Use(AuthMiddleware(tm))
		{
			securedAuth.DELETE("/session", h.DeleteSession)
			securedAuth.DELETE("/sessions", h.DeleteAllSessions)
			securedAuth.GET("/sessions", h.GetSessions)
			securedAuth.GET("/me", h.Me)
			securedAuth.PATCH("/user", h.UpdateUser)
		}
	}

	return r
}
