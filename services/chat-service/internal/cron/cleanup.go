package cron

import (
	"chat-service/internal/usecase"
	"context"
	"github.com/ZoyaDenisova/go-common/logger"
	"time"

	"github.com/robfig/cron/v3"
)

type CleanupCron struct {
	log logger.Interface
	uc  usecase.MessageUsecase
}

func NewCleanupCron(log logger.Interface, uc usecase.MessageUsecase) *CleanupCron {
	return &CleanupCron{
		log: log,
		uc:  uc,
	}
}

func (c *CleanupCron) Start(schedule string, thresholdHours int) {
	cronScheduler := cron.New()

	_, err := cronScheduler.AddFunc(schedule, func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()

		threshold := time.Now().UTC().Add(-time.Duration(thresholdHours) * time.Hour)

		c.log.Info("cron: running message cleanup", "threshold", threshold)
		if err := c.uc.CleanupOldMessages(ctx, threshold); err != nil {
			c.log.Error("cron: cleanup failed", "err", err)
		}
	})
	if err != nil {
		c.log.Fatal("failed to register cron job", "err", err)
	}

	c.log.Info("cron: cleanup job scheduled", "schedule", schedule)
	cronScheduler.Start()
}
