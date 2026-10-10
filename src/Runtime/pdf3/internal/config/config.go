package config

import (
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/log"
)

var logger = log.NewComponent("config")

const (
	// EnvironmentLocaltest identifies localtest execution mode.
	EnvironmentLocaltest = "localtest"
	// LocaltestPublicBaseURLEnv provides the canonical public base URL used for localtest URL rewriting.
	LocaltestPublicBaseURLEnv = "PDF3_LOCALTEST_PUBLIC_BASE_URL"
	// ServiceOwnerEnv provides the service owner for the current runtime cluster.
	ServiceOwnerEnv = "PDF3_SERVICEOWNER"
	// PrewarmURLsEnv lists, comma-separated, the public assets to load into each browser context
	// before a request uses it. Unset means DefaultPrewarmURLs, empty disables warming.
	PrewarmURLsEnv = "PDF3_PREWARM_URLS"
)

// DefaultPrewarmURLs are the frontend assets v8 apps load from the CDN, see
// src/App/template/v8/src/App/views/Home/Index.cshtml. The default lives here rather than in the
// manifests because the worker also runs without them, for example in localtest.
var DefaultPrewarmURLs = []string{
	"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js",
	"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.css",
}

var defaultPDFAConversionConfig = PDFAConversionConfig{
	Targets: []PDFATarget{
		{Environment: "tt02", ServiceOwner: "ikta"},
		{Environment: "prod", ServiceOwner: "ikta"},
	},
}

type PDFATarget struct {
	Environment  string
	ServiceOwner string
}

type PDFAConversionConfig struct {
	Targets []PDFATarget
}

type Config struct {
	Environment            string
	LocaltestPublicBaseURL string
	ServiceOwner           string
	PDFA                   PDFAConversionConfig
	PrewarmURLs            []string
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
		LocaltestPublicBaseURL: os.Getenv(LocaltestPublicBaseURLEnv),
		ServiceOwner:           os.Getenv(ServiceOwnerEnv),
		PDFA:                   defaultPDFAConversionConfig,
		PrewarmURLs:            parsePrewarmURLs(os.LookupEnv(PrewarmURLsEnv)),
	}
}

// parsePrewarmURLs parses the value of PrewarmURLsEnv, set is false if the variable is unset.
// Entries that aren't absolute http(s) URLs are skipped with a warning.
func parsePrewarmURLs(value string, set bool) []string {
	if !set {
		return slices.Clone(DefaultPrewarmURLs)
	}
	urls := []string{}
	for entry := range strings.SplitSeq(value, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		parsed, err := url.Parse(entry)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			logger.Warn("Ignoring invalid "+PrewarmURLsEnv+" entry", "value", entry, "error", err)
			continue
		}
		urls = append(urls, entry)
	}
	return urls
}

func (c *Config) ShouldConvertToPDFA() bool {
	return c.PDFA.EnabledFor(c.Environment, c.ServiceOwner)
}

func (c PDFAConversionConfig) EnabledFor(environment string, serviceOwner string) bool {
	for _, target := range c.Targets {
		if target.matches(environment, serviceOwner) {
			return true
		}
	}
	return false
}

func (t PDFATarget) matches(environment string, serviceOwner string) bool {
	if t.Environment == "" && t.ServiceOwner == "" {
		return false
	}

	if t.Environment != "" && !equalConfigValue(environment, t.Environment) {
		return false
	}

	if t.ServiceOwner != "" && !equalConfigValue(serviceOwner, t.ServiceOwner) {
		return false
	}

	return true
}

func equalConfigValue(value string, candidate string) bool {
	return strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(candidate))
}

// ShouldConfigureOTel reports whether PDF3 should initialize OpenTelemetry exporters.
// In localtest, exporters are opt-in to avoid noisy connection errors in default setup.
func ShouldConfigureOTel(environment string) bool {
	if environment != EnvironmentLocaltest {
		return true
	}

	for _, key := range []string{
		"OTEL_EXPORTER_OTLP_ENDPOINT",
		"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
		"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
	} {
		if val := os.Getenv(key); val != "" {
			return true
		}
	}

	return false
}

// HostParameters contains timeout values for runtime.NewHost.
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
