package config

import (
	"context"
	"fmt"
	"os"
	"path"
	"reflect"
	"time"

	"altinn.studio/operator/internal/telemetry"
	"github.com/go-viper/mapstructure/v2"
	"github.com/knadh/koanf/parsers/dotenv"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
	"go.opentelemetry.io/otel"
)

var parser = dotenv.ParserEnv("", ".", func(s string) string { return s })

// resolveConfigFilePath resolves the config file path from:
// 1. The provided configFilePath parameter if non-empty
// 2. The OPERATOR_CONFIG_FILE environment variable if set
// 3. Falls back to "localtest.env" in the project root (for local development)
func resolveConfigFilePath(configFilePath string) (string, error) {
	if configFilePath != "" {
		return configFilePath, nil
	}

	// Env var is set from Dockerfile, k8s manifests
	if envPath := os.Getenv("OPERATOR_CONFIG_FILE"); envPath != "" {
		return envPath, nil
	}

	// If we are running locally, try to find project root
	rootDir, err := TryFindProjectRootByGoMod()
	if err != nil {
		return "", fmt.Errorf("error resolving config file path: %w", err)
	}
	if rootDir != "" {
		return path.Join(rootDir, "localtest.env"), nil
	}

	return "", fmt.Errorf("no config file path provided and OPERATOR_CONFIG_FILE not set")
}

// loadFromKoanf loads configuration from a .env file.
// The configFilePath must be a resolved absolute path.
func loadFromKoanf(ctx context.Context, configFilePath string) (*Config, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	_, span := tracer.Start(ctx, "loadFromKoanf")
	defer span.End()

	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file does not exist: '%s'", configFilePath)
	}

	k := koanf.New(".")
	if err := k.Load(file.Provider(configFilePath), parser); err != nil {
		return nil, fmt.Errorf("error loading config '%s': %w", configFilePath, err)
	}

	var cfg Config

	unmarshalConf := koanf.UnmarshalConf{
		DecoderConfig: &mapstructure.DecoderConfig{
			DecodeHook: mapstructure.ComposeDecodeHookFunc(
				durationDecodeHook(),
			),
			Metadata:         nil,
			Result:           &cfg,
			WeaklyTypedInput: true,
		},
	}

	if err := k.UnmarshalWithConf("", &cfg, unmarshalConf); err != nil {
		return nil, fmt.Errorf("error unmarshalling config '%s': %w", configFilePath, err)
	}

	return &cfg, nil
}

// durationDecodeHook returns a mapstructure decode hook that parses duration strings with day support.
func durationDecodeHook() mapstructure.DecodeHookFunc {
	return func(f reflect.Type, t reflect.Type, data interface{}) (interface{}, error) {
		if t != reflect.TypeOf(time.Duration(0)) {
			return data, nil
		}

		switch v := data.(type) {
		case string:
			return ParseDuration(v)
		case time.Duration:
			return v, nil
		default:
			return data, nil
		}
	}
}
