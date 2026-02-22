package config

import (
	"os"
	"strconv"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/log"
)

var logger = log.NewComponent("config")

const (
	EnvironmentLocaltest = "localtest"
)

type Config struct {
	Environment string

	QueueSize              int
	BrowserRestartInterval time.Duration
}

func ReadConfig() *Config {
	environment := os.Getenv("PDF3_ENVIRONMENT")
	assert.That(
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

// HostParameters contains timeout values for runtime.NewHost
type HostParameters struct {
	ReadinessDrainDelay time.Duration
	ShutdownPeriod      time.Duration
	ShutdownHardPeriod  time.Duration
}

// ResolveHostParametersForEnvironment returns appropriate host parameters based on environment.
// Localtest uses zero timeouts for fast restarts, production uses full graceful shutdown periods.
func ResolveHostParametersForEnvironment(environment string) HostParameters {
	if environment == EnvironmentLocaltest {
		// Minimal delays for local development - fast restarts
		return HostParameters{
			ReadinessDrainDelay: 0,
			ShutdownPeriod:      0,
			ShutdownHardPeriod:  0,
		}
	}
	// Production timeouts - aligned with k8s terminationGracePeriodSeconds
	return HostParameters{
		ReadinessDrainDelay: 5 * time.Second,
		ShutdownPeriod:      45 * time.Second,
		ShutdownHardPeriod:  3 * time.Second,
	}
}

// ResolveTelemetryShutdownTimeoutForEnvironment returns how long to wait for OTel shutdown flush.
// Localtest skips graceful flush to prioritize fast restarts.
func ResolveTelemetryShutdownTimeoutForEnvironment(environment string) time.Duration {
	if environment == EnvironmentLocaltest {
		return 0
	}
	return 5 * time.Second
}
