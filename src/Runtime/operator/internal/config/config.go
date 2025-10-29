package config

import (
	"fmt"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"github.com/go-playground/validator/v10"
)

type Config struct {
	MaskinportenApi MaskinportenApiConfig `koanf:"maskinporten_api" validate:"required"`
	Controller      ControllerConfig      `koanf:"controller"       validate:"required"`
}

type MaskinportenApiConfig struct {
	ClientId       string `koanf:"client_id"        validate:"required"`
	AuthorityUrl   string `koanf:"authority_url"    validate:"required,http_url"`
	SelfServiceUrl string `koanf:"self_service_url" validate:"required,http_url"`
	Jwk            string `koanf:"jwk"              validate:"required,json"`
	Scope          string `koanf:"scope"            validate:"required"`
}

type ControllerConfig struct {
	RequeueAfter time.Duration `koanf:"requeue_after" validate:"required,min=5s,max=72h"`
}

type ConfigSource int

const (
	ConfigSourceDefault ConfigSource = iota
	ConfigSourceKoanf
	ConfigSourceAureKeyVault
)

func GetConfig(operatorContext *operatorcontext.Context, source ConfigSource, configFilePath string) (*Config, error) {
	span := operatorContext.StartSpan("GetConfig")
	defer span.End()

	var cfg *Config
	var err error
	if source == ConfigSourceKoanf {
		cfg, err = loadFromKoanf(operatorContext, configFilePath)
	} else if source == ConfigSourceAureKeyVault {
		cfg, err = loadFromAzureKeyVault(operatorContext)
	} else if source == ConfigSourceDefault {
		if operatorContext.Environment == operatorcontext.EnvironmentLocal {
			cfg, err = loadFromKoanf(operatorContext, configFilePath)
		} else if operatorContext.Environment == operatorcontext.EnvironmentDev {
			cfg, err = loadFromKoanf(operatorContext, configFilePath)
		} else {
			return nil, fmt.Errorf("could not resolve default config source for env: %s", operatorContext.Environment)
		}
	} else {
		return nil, fmt.Errorf("invalid config source: %d", source)
	}

	if err != nil {
		return nil, err
	}

	validate := validator.New(validator.WithRequiredStructEnabled())

	if err := validate.Struct(cfg); err != nil {
		return nil, err
	}

	// k.Print() // Uncomment to print the config, only for debug, there be secrets

	return cfg, nil
}

func GetConfigOrDie(operatorContext *operatorcontext.Context, source ConfigSource, configFilePath string) *Config {
	cfg, err := GetConfig(operatorContext, source, configFilePath)
	if err != nil {
		panic(err)
	}
	return cfg
}
