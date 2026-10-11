// The relay runs in each tenant cluster and forwards apps' PDF requests to the
// shared pdf3, adding the API key it requires and the cluster's service owner.
// Apps keep calling the same address.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"time"

	"altinn.studio/pdf3/internal/auth"
	"altinn.studio/pdf3/internal/config"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/log"
	iruntime "altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

const (
	// upstreamURLEnv is the shared pdf3's PDF endpoint, e.g. https://platform.tt02.altinn.no/pdf3/pdf.
	upstreamURLEnv = "PDF3_UPSTREAM_URL"
	// apiKeyFileEnv points to a file whose first key is the API key to send, see auth.KeyFile.
	apiKeyFileEnv = "PDF3_API_KEY_FILE" //nolint:gosec // The name of an environment variable, not a credential.
)

//nolint:funlen // The relay entrypoint owns startup, probes, and shutdown wiring, like the proxy's.
func main() {
	logger := log.NewComponent("relay")

	logger.Info("Starting", attr.GoMaxProcs, runtime.GOMAXPROCS(0), attr.NumCPU, runtime.NumCPU())

	cfg := config.ReadConfig()
	otelShutdown, err := telemetry.ConfigureOTel(
		context.Background(),
		cfg.Environment,
		config.ResolveOTelSignals(cfg.Environment),
	)
	if err != nil {
		logger.Error("Failed to initialize telemetry", attr.Error, err)
		os.Exit(1)
	}

	upstream, keys := readUpstream(logger, cfg)

	hostParams := config.ResolveHostParametersForEnvironment(cfg.Environment)

	host := iruntime.NewHost(
		hostParams.ReadinessDrainDelay,
		hostParams.ShutdownPeriod,
		hostParams.ShutdownHardPeriod,
	)
	defer host.Stop()

	go keys.Watch(host.ServerContext(), auth.ReloadInterval)

	rl := newRelay(logger, upstream, keys, cfg.ServiceOwner)

	// Probes only reflect this process, so an unreachable upstream doesn't take the relay out of rotation.
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteProbe(r.Context(), logger, w, !host.IsShuttingDown())
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteProbe(r.Context(), logger, w, !host.IsShuttingDown())
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteText(r.Context(), logger, w, http.StatusOK, "OK")
	})
	http.Handle("/pdf", telemetry.WrapHandler("POST /pdf", rl.handlePdf))

	server := &http.Server{
		Addr:              ":5032",
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		logger.Info(
			"Starting relay HTTP server",
			attr.ListenAddress, server.Addr,
			attr.UpstreamURL, telemetry.RedactURL(upstream),
			attr.ServiceOwner, cfg.ServiceOwner,
		)
		if listenErr := server.ListenAndServe(); listenErr != nil && !errors.Is(listenErr, http.ErrServerClosed) {
			logger.Error("HTTP server crashed", attr.Error, listenErr)
			os.Exit(1)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	logger.Info("Shutting down HTTP server")
	err = server.Shutdown(host.ServerContext())
	if err != nil {
		logger.Warn("Failed to wait for ongoing requests to finish, waiting for forced cancellation")
		host.WaitForHardShutdown()
	} else {
		logger.Info("Gracefully shut down HTTP server")
	}

	logger.Info("Shutting down telemetry")
	telemetryShutdownTimeout := config.ResolveTelemetryShutdownTimeoutForEnvironment(cfg.Environment)
	if telemetryShutdownTimeout == 0 {
		logger.Info("Skipping graceful telemetry flush", attr.DeploymentEnvironmentName, cfg.Environment)
	} else {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
		defer cancel()
		if err := otelShutdown(shutdownCtx); err != nil {
			logger.Warn("Failed to gracefully shut down telemetry", attr.Error, err)
		}
	}

	logger.Info("Server shut down gracefully")
}

// readUpstream returns the shared pdf3's PDF endpoint and the API key to send it, and checks that
// the cluster's service owner is set. It exits if any of them is missing or invalid.
func readUpstream(logger *slog.Logger, cfg *config.Config) (string, *auth.KeyFile) {
	// The shared pdf3 decides on PDF/A conversion by the service owner the relay sends.
	if !serviceowner.Valid(cfg.ServiceOwner) {
		logger.Error(
			"PDF3_SERVICEOWNER must be set to the cluster's service owner, a lowercase DNS label",
			attr.ConfigEnvVar, config.ServiceOwnerEnv,
			attr.ConfigValue, cfg.ServiceOwner,
		)
		os.Exit(1)
	}

	upstream := os.Getenv(upstreamURLEnv)
	upstreamURL, ok := parseUpstreamURL(upstream)
	if !ok {
		logger.Error(
			"PDF3_UPSTREAM_URL must be an absolute http(s) URL without user information, query or fragment",
			attr.ConfigEnvVar, upstreamURLEnv,
			attr.ConfigValue, telemetry.RedactURL(upstream),
		)
		os.Exit(1)
	}
	if upstreamURL.Scheme != "https" {
		logger.Warn(
			"PDF3_UPSTREAM_URL is not https, API keys and PDFs are sent unencrypted",
			attr.UpstreamURL, telemetry.RedactURL(upstream),
		)
	}

	keyFile := os.Getenv(apiKeyFileEnv)
	keys, err := auth.Load(logger, keyFile)
	if err != nil {
		logger.Error(
			"Failed to load the API key",
			attr.ConfigEnvVar, apiKeyFileEnv,
			attr.APIKeysFile, keyFile,
			attr.Error, err,
		)
		os.Exit(1)
	}
	return upstream, keys
}

// parseUpstreamURL parses upstream, which must be an absolute http(s) URL. It is logged, so it must
// not hold user information, a query or a fragment.
func parseUpstreamURL(upstream string) (*url.URL, bool) {
	u, err := url.Parse(upstream)
	ok := err == nil &&
		(u.Scheme == "https" || u.Scheme == "http") &&
		u.Host != "" &&
		u.User == nil &&
		u.RawQuery == "" && !u.ForceQuery &&
		u.Fragment == ""
	return u, ok
}
