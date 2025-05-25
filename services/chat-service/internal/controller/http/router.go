package http

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	authpb "chat-service/cmd/app/docs/proto"

	_ "chat-service/cmd/app/docs"
	"chat-service/config"
	wsCtrl "chat-service/internal/controller/ws"
	"chat-service/internal/usecase"

	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

//todo проверить логирование на всем проекте

// NewRouter настраивает все HTTP- и WebSocket-эндпоинты для chat-сервиса
func NewRouter(
	log logger.Interface,
	catUC usecase.CategoryUsecase,
	topicUC usecase.TopicUsecase,
	msgUC usecase.MessageUsecase,
	hub *wsCtrl.Hub,
	authClient authpb.AuthServiceClient,
	cfg *config.Config,
) http.Handler {
	r := gin.New()

	r.Use(LoggingMiddleware(log))
	r.Use(gin.Recovery())

	// Swagger UI
	if cfg.Swagger.Enabled {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// Health-check
	r.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// инициализируем обработчики
	catH := NewCategoryHandler(catUC)
	topicH := NewTopicHandler(topicUC)
	msgH := NewMessageHandler(msgUC)
	wsH := NewWSHandler(hub)

	// CORS как в auth-сервисе
	corsConfig := cors.Config{
		AllowOrigins: []string{"http://172.20.10.2:5173"},
		AllowOriginFunc: func(origin string) bool {
			u, err := url.Parse(origin)
			if err != nil {
				return false
			}
			return strings.HasPrefix(u.Hostname(), "172.20.1.")
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// PUBLIC
	r.GET("/categories", catH.ListCategories)
	r.GET("/categories/:id", catH.GetCategory)
	r.GET("/categories/:id/topics", topicH.ListTopics)
	r.GET("/topics/:id", topicH.GetTopic)
	r.GET("/topics/:id/messages", msgH.GetMessages)
	// подписка по WebSocket (можно без авторизации чтения, но мы всё же проверяем токен)
	r.GET("/ws/topics/:id", wsH.ServeWS)

	// PROTECTED
	secured := r.Group("/")
	secured.Use(AuthMiddleware(authClient))
	{
		// Category
		secured.POST("/categories", catH.CreateCategory)
		secured.PUT("/categories/:id", catH.UpdateCategory)
		secured.DELETE("/categories/:id", catH.DeleteCategory)

		// Topic
		secured.POST("/topics", topicH.CreateTopic)
		secured.PUT("/topics/:id", topicH.UpdateTopic)
		secured.DELETE("/topics/:id", topicH.DeleteTopic)

		// Message
		secured.POST("/topics/:id/messages", msgH.SendMessage)
		secured.PUT("/messages/:id", msgH.UpdateMessage)
		secured.DELETE("/messages/:id", msgH.DeleteMessage)
	}

	return r
}
