// internal/cron/session_cleanup.go
package cron

import (
	"context"
	"time"

	"auth-service/internal/usecase"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/robfig/cron/v3"
)

func RegisterSessionCleanup(
	c *cron.Cron,
	schedule string,
	sessUC usecase.Session,
	log logger.Interface,
) error {
	_, err := c.AddFunc(schedule, func() {
		log.Info("cron: starting session cleanup")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := sessUC.DeleteExpired(ctx); err != nil {
			log.Error("cron: session cleanup failed", err)
		} else {
			log.Info("cron: session cleanup completed")
		}
	})
	return err
}
