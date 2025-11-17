package config

import (
	"os"
	"strconv"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/log"
)

var logger = log.NewComponent("config")

type Config struct {
	Environment string

	QueueSize              int
	BrowserRestartInterval time.Duration
}

func ReadConfig() *Config {
	environment := os.Getenv("PDF3_ENVIRONMENT")
	assert.AssertWithMessage(
		environment != "",
		"PDF3_ENVIRONMENT environment variable must be set",
	)

	queueSizeStr := os.Getenv("PDF3_QUEUE_SIZE")
	queueSize := 0
	if queueSizeStr != "" {
		if parsed, err := strconv.Atoi(queueSizeStr); err == nil && parsed >= 0 {
			queueSize = parsed
		} else {
			logger.Warn(
				"Failed to parse PDF3_QUEUE_SIZE, using default",
				"value", queueSizeStr,
				"default", queueSize,
				"error", err,
			)
		}
	}

	browserRestartIntervalStr := os.Getenv("PDF3_BROWSER_RESTART_INTERVAL")
	browserRestartInterval := 30 * time.Minute // default value
	if browserRestartIntervalStr != "" {
		if parsed, err := time.ParseDuration(browserRestartIntervalStr); err == nil {
			browserRestartInterval = parsed
		} else {
			logger.Warn(
				"Failed to parse PDF3_BROWSER_RESTART_INTERVAL, using default",
				"value", browserRestartIntervalStr,
				"default", browserRestartInterval,
				"error", err,
			)
		}
	}

	return &Config{
		Environment:            environment,
		QueueSize:              queueSize,
		BrowserRestartInterval: browserRestartInterval,
	}
}
