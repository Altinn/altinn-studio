// Package config reads and validates runtime configuration.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

const (
	defaultNamespace    = "default"
	defaultListen       = ":8080"
	defaultServiceName  = "kubernetes-wrapper"
	environmentVariable = "KUBERNETES_WRAPPER_ENVIRONMENT"
)

var errInvalidListenAddress = errors.New("KUBERNETES_WRAPPER_LISTEN_ADDRESS must be in ':port' form")

// Config contains runtime configuration values for kubernetes-wrapper.
//
//nolint:govet // String-heavy config model; fieldalignment suggestion is not useful here.
type Config struct {
	Namespace       string
	ListenAddress   string
	Kubeconfig      string
	Development     bool
	OtelServiceName string
}

// ReadFromEnv reads configuration from environment variables and applies defaults.
func ReadFromEnv() (Config, error) {
	namespace := strings.TrimSpace(os.Getenv("KUBERNETES_WRAPPER_NAMESPACE"))
	if namespace == "" {
		namespace = defaultNamespace
	}

	listenAddress := strings.TrimSpace(os.Getenv("KUBERNETES_WRAPPER_LISTEN_ADDRESS"))
	if listenAddress == "" {
		listenAddress = defaultListen
	}
	if !strings.HasPrefix(listenAddress, ":") {
		return Config{}, fmt.Errorf("%w", errInvalidListenAddress)
	}

	serviceName := strings.TrimSpace(os.Getenv("OTEL_SERVICE_NAME"))
	if serviceName == "" {
		serviceName = defaultServiceName
	}

	environment := strings.TrimSpace(os.Getenv(environmentVariable))
	if environment == "" {
		environment = strings.TrimSpace(os.Getenv("ASPNETCORE_ENVIRONMENT"))
	}

	return Config{
		Namespace:       namespace,
		ListenAddress:   listenAddress,
		Kubeconfig:      strings.TrimSpace(os.Getenv("KUBECONFIG")),
		Development:     strings.EqualFold(environment, "development"),
		OtelServiceName: serviceName,
	}, nil
}
