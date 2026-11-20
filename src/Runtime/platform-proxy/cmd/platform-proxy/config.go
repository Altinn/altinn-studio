package main

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"regexp"
)

const (
	// upstreamURLEnv is the platform's origin in the environment, such as https://platform.tt02.altinn.no.
	upstreamURLEnv = "PLATFORM_PROXY_UPSTREAM_URL"
	// serviceOwnerEnv is the runtime cluster's service owner, such as ttd, the issuer of its tokens.
	serviceOwnerEnv = "PLATFORM_PROXY_SERVICEOWNER"
)

// serviceOwnerPattern is a service owner's short name, a lowercase DNS label as in the runtime cluster's
// configuration.
var serviceOwnerPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

var (
	errInvalidUpstream     = errors.New(upstreamURLEnv + " must be an https origin, such as https://platform.altinn.no")
	errInvalidServiceOwner = errors.New(serviceOwnerEnv + " must be the cluster's service owner, a lowercase DNS label")
)

type config struct {
	upstream     *url.URL
	serviceOwner string
}

func readConfig() (*config, error) {
	upstream, err := parseUpstream(os.Getenv(upstreamURLEnv))
	if err != nil {
		return nil, err
	}
	serviceOwner := os.Getenv(serviceOwnerEnv)
	if !serviceOwnerPattern.MatchString(serviceOwner) {
		return nil, fmt.Errorf("%w, got %q", errInvalidServiceOwner, serviceOwner)
	}
	return &config{upstream: upstream, serviceOwner: serviceOwner}, nil
}

// parseUpstream accepts an https origin only. The proxy sends tokens there, so plain HTTP would expose them,
// and a path would be put in front of every request's own.
func parseUpstream(value string) (*url.URL, error) {
	upstream, err := url.Parse(value)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errInvalidUpstream, err)
	}
	isOrigin := upstream.Scheme == "https" &&
		upstream.Host != "" &&
		upstream.User == nil &&
		(upstream.Path == "" || upstream.Path == "/") &&
		upstream.RawQuery == "" && !upstream.ForceQuery &&
		upstream.Fragment == ""
	if !isOrigin {
		return nil, fmt.Errorf("%w, got %q", errInvalidUpstream, value)
	}
	upstream.Path = ""
	return upstream, nil
}
