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

	if configFilePath == "" {
		// Env var is set from Dockerfile, k8s manifests
		if envPath := os.Getenv("OPERATOR_CONFIG_FILE"); envPath != "" {
			configFilePath = envPath
		} else {
			// If we are running locally, try to find project root
			rootDir, err := TryFindProjectRootByGoMod()
			if err != nil {
				return nil, fmt.Errorf("error loading config from koanf: %w", err)
			}
			if rootDir != "" {
				configFilePath = path.Join(rootDir, "localtest.env")
			} else {
				return nil, fmt.Errorf("no config file path provided and OPERATOR_CONFIG_FILE not set")
			}
		}
	}

	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file does not exist: '%s'", configFilePath)
	}

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
