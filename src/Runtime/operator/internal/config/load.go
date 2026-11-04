package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path"
	"strings"
	"time"
	"unicode"

	"altinn.studio/operator/internal/telemetry"
)

var errConfigFilePathNotSet = errors.New("no config file path provided and OPERATOR_CONFIG_FILE not set")
var errConfigFileDoesNotExist = errors.New("config file does not exist")
var errInvalidDotenvKey = errors.New("expected KEY=VALUE with a key of letters, digits, '_' and '.'")
var errUnsupportedDotenvValue = errors.New("unsupported value, use single quotes for a literal value")

// resolveConfigFilePath resolves the config file path from:
// 1. The provided configFilePath parameter if non-empty
// 2. The OPERATOR_CONFIG_FILE environment variable if set
// 3. Falls back to "localtest.env" in the project root (for local development).
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

	return "", errConfigFilePathNotSet
}

// loadFromFile loads configuration from a .env file.
// The configFilePath must be a resolved absolute path.
func loadFromFile(ctx context.Context, configFilePath string) (*Config, error) {
	_, span := telemetry.Tracer().Start(ctx, "loadFromFile")
	defer span.End()

	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("%w: %s", errConfigFileDoesNotExist, configFilePath)
	}

	contents, err := os.ReadFile(configFilePath) //nolint:gosec // The path is the operator's own config file.
	if err != nil {
		return nil, fmt.Errorf("error loading config '%s': %w", configFilePath, err)
	}
	values, err := parseDotenv(string(contents))
	if err != nil {
		return nil, fmt.Errorf("error loading config '%s': %w", configFilePath, err)
	}

	cfg, err := decodeConfig(values)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling config '%s': %w", configFilePath, err)
	}

	return cfg, nil
}

// decodeConfig maps the file's keys to the config. Other keys are ignored, and missing keys leave zero values.
func decodeConfig(values map[string]string) (*Config, error) {
	var errs []error
	duration := func(key string) time.Duration {
		value, ok := values[key]
		if !ok {
			return 0
		}
		d, err := ParseDuration(value)
		if err != nil {
			errs = append(errs, fmt.Errorf("'%s' %w", key, err))
		}
		return d
	}

	cfg := Config{
		MaskinportenApi: MaskinportenApiConfig{
			ClientId:       values["maskinporten_api.client_id"],
			AuthorityUrl:   values["maskinporten_api.authority_url"],
			SelfServiceUrl: values["maskinporten_api.self_service_url"],
			Jwk:            values["maskinporten_api.jwk"],
			Scope:          values["maskinporten_api.scope"],
		},
		OrgRegistry: OrgRegistryConfig{
			URL: values["org_registry.url"],
		},
		MaskinportenController: MaskinportenControllerConfig{
			RequeueAfter:         duration("maskinporten_controller.requeue_after"),
			JwkRotationThreshold: duration("maskinporten_controller.jwk_rotation_threshold"),
			JwkExpiry:            duration("maskinporten_controller.jwk_expiry"),
		},
		KeyVaultSyncController: KeyVaultSyncControllerConfig{
			PollInterval: duration("keyvault_sync_controller.poll_interval"),
		},
	}
	if len(errs) > 0 {
		return nil, fmt.Errorf("decoding failed due to the following error(s):\n\n%w", errors.Join(errs...))
	}
	return &cfg, nil
}

// parseDotenv reads KEY=VALUE lines, skipping blank lines and # comments. A later key replaces an earlier one.
//
// It reads the subset of godotenv's syntax that config files use, with the same result, and rejects the rest rather
// than read it differently. An unquoted value ends at a # that follows whitespace. A value in single quotes is
// literal. A value in double quotes must not need escapes. A $ outside single quotes is rejected, since godotenv
// expands it, and so is a lone carriage return in an unquoted value, where godotenv starts a new line. Errors name
// the line but not its contents, which can be secret.
func parseDotenv(contents string) (map[string]string, error) {
	values := make(map[string]string)
	lines := strings.Split(strings.ReplaceAll(contents, "\r\n", "\n"), "\n")
	for i, line := range lines {
		line = strings.TrimLeftFunc(line, unicode.IsSpace)
		if line == "" || line[0] == '#' {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		key = strings.TrimRight(key, " \t\v\f\r")
		// godotenv reads "export KEY=VALUE" as KEY.
		if !found || key == "" || key == "export" || strings.ContainsFunc(key, isInvalidKeyRune) {
			return nil, fmt.Errorf("line %d: %w", i+1, errInvalidDotenvKey)
		}

		value, err := parseDotenvValue(strings.Trim(value, dotenvSpace))
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", i+1, err)
		}
		values[key] = value
	}
	return values, nil
}

// dotenvSpace is the whitespace godotenv trims from values.
const dotenvSpace = " \t\v\f\r\u0085\u00a0"

func parseDotenvValue(value string) (string, error) {
	if value != "" && (value[0] == '\'' || value[0] == '"') {
		quote := value[:1]
		inner, closed := strings.CutSuffix(value[1:], quote)
		escaped := strings.HasSuffix(inner, `\`) || quote == `"` && strings.ContainsAny(inner, `\$`)
		if !closed || escaped || strings.Contains(inner, quote) {
			return "", errUnsupportedDotenvValue
		}
		return inner, nil
	}

	if strings.ContainsAny(value, "$\r") {
		return "", errUnsupportedDotenvValue
	}
	runes := []rune(value)
	end := len(runes)
	for i := end - 1; i > 0; i-- {
		if runes[i] == '#' && strings.ContainsRune(dotenvSpace, runes[i-1]) {
			end = i
			break
		}
	}
	return strings.Trim(string(runes[:end]), dotenvSpace), nil
}

func isInvalidKeyRune(r rune) bool {
	return (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') && (r < '0' || r > '9') && r != '_' && r != '.'
}
