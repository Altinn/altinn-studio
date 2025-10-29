package config

import (
	"context"
	"fmt"
	"os"
	"path"

	"altinn.studio/operator/internal/telemetry"
	"github.com/knadh/koanf/parsers/dotenv"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
	"go.opentelemetry.io/otel"
)

var (
	k      = koanf.New(".")
	parser = dotenv.ParserEnv("", ".", func(s string) string { return s })
)

// loadFromKoanf loads configuration from a .env file.
// The file path is determined by:
// 1. The configFilePath parameter if provided
// 2. The OPERATOR_CONFIG_FILE environment variable if set
// 3. Falls back to "{environment}.env" in the project root (for local development)
func loadFromKoanf(ctx context.Context, configFilePath string) (*Config, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	_, span := tracer.Start(ctx, "GetConfig.Koanf")
	defer span.End()

	// Determine config file path
	if configFilePath == "" {
		if envPath := os.Getenv("OPERATOR_CONFIG_FILE"); envPath != "" {
			configFilePath = envPath
		}
	}

	// If still empty, fall back to localtest.env in project root (for local development)
	if configFilePath == "" {
		rootDir := TryFindProjectRoot()
		configFilePath = path.Join(rootDir, "localtest.env")
	}

	// Check file exists
	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file does not exist: '%s'", configFilePath)
	}

	if err := k.Load(file.Provider(configFilePath), parser); err != nil {
		return nil, fmt.Errorf("error loading config '%s': %w", configFilePath, err)
	}

	var cfg Config

	if err := k.Unmarshal("", &cfg); err != nil {
		return nil, fmt.Errorf("error unmarshalling config '%s': %w", configFilePath, err)
	}

	return &cfg, nil
}
