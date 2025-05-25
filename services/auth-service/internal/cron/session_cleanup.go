package cron

import (
	"context"
	"time"

	"auth-service/internal/usecase"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/robfig/cron/v3"
)

type SessionCleanupCron struct {
	log logger.Interface
	uc  usecase.Session
}

func NewSessionCleanupCron(log logger.Interface, uc usecase.Session) *SessionCleanupCron {
	return &SessionCleanupCron{
		log: log,
		uc:  uc,
	}
}

func (c *SessionCleanupCron) Start(schedule string) error {
	cronScheduler := cron.New()

	_, err := cronScheduler.AddFunc(schedule, func() {
		c.log.Info("cron: starting session cleanup")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := c.uc.DeleteExpired(ctx); err != nil {
			c.log.Error("cron: session cleanup failed", "err", err)
		} else {
			c.log.Info("cron: session cleanup completed")
		}
	})
	if err != nil {
		c.log.Error("failed to register session cleanup cron job", "err", err)
		return err
	}

	c.log.Info("cron: session cleanup job scheduled", "schedule", schedule)
	cronScheduler.Start()

	return nil
}
