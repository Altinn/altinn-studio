package config

import (
	"fmt"
	"os"
	"path"

	"altinn.studio/operator/internal/operatorcontext"
	"github.com/knadh/koanf/parsers/dotenv"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

var (
	k      = koanf.New(".")
	parser = dotenv.ParserEnv("", ".", func(s string) string { return s })
)

func loadFromKoanf(operatorContext *operatorcontext.Context, configFilePath string) (*Config, error) {
	span := operatorContext.StartSpan("GetConfig.Koanf")
	defer span.End()

	rootDir := TryFindProjectRoot()

	if configFilePath == "" {
		configFilePath = fmt.Sprintf("%s.env", operatorContext.Environment)
	}

	if !operatorContext.IsLocal() && !operatorContext.IsDev() {
		return nil, fmt.Errorf("loading config from koanf is only supported for local environment")
	}

	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		if path.IsAbs(configFilePath) {
			return nil, fmt.Errorf("env file does not exist: '%s'", configFilePath)
		} else {
			return nil, fmt.Errorf("env file does not exist in '%s': '%s'", rootDir, configFilePath)
		}
	}

	if !path.IsAbs(configFilePath) {
		configFilePath = path.Join(rootDir, configFilePath)
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
