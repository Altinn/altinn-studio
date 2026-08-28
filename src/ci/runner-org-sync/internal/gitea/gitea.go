// Package gitea is a minimal admin client for Gitea — just enough to mint
// per-organisation Actions runner registration tokens.
//
// The endpoint targeted is Gitea's organisation-scoped runner registration
// token API. The returned token is a one-shot string that an act_runner
// process uses to register itself with Gitea; once registered the runner
// keeps its own long-lived identity.
package gitea

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultTimeout   = 15 * time.Second
	defaultUserAgent = "runner-org-sync"
	maxErrorBody     = 512
	// maxSuccessBody caps the registration-token JSON decode. The real
	// response is a few hundred bytes; 16 KiB is generous defense against
	// a pathological Gitea reply.
	maxSuccessBody = 16 << 10 // 16 KiB
)

// Sentinel errors. Callers can errors.Is against these to drive reconcile
// policy (e.g. ErrUnauthorized → fatal; ErrOrgNotFound → skip & continue).
var (
	ErrUnauthorized = errors.New("gitea: unauthorized (bad PAT)")
	ErrOrgNotFound  = errors.New("gitea: organisation not found")
	ErrOrgRequired  = errors.New("gitea: org is required")
	ErrServer       = errors.New("gitea: server error")
	ErrUnexpected   = errors.New("gitea: unexpected status")
	ErrEmptyToken   = errors.New("gitea: empty token in response")
)

// Client talks to a Gitea instance using a Personal Access Token.
type Client struct {
	httpClient *http.Client
	baseURL    string
	pat        string
	userAgent  string
}

// Option configures a Client.
type Option func(*Client)

// WithHTTPClient overrides the default HTTP client.
func WithHTTPClient(h *http.Client) Option {
	return func(c *Client) { c.httpClient = h }
}

// WithUserAgent overrides the User-Agent header.
func WithUserAgent(ua string) Option {
	return func(c *Client) { c.userAgent = ua }
}

// NewClient constructs a Client. baseURL should be the Gitea instance root
// (e.g. "http://altinn-repositories-public.default.svc.cluster.local"); the
// trailing slash is normalised away.
func NewClient(baseURL, pat string, opts ...Option) *Client {
	c := &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
		baseURL:    strings.TrimRight(baseURL, "/"),
		pat:        pat,
		userAgent:  defaultUserAgent,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// MintRegistrationToken returns a fresh runner registration token for the
// given organisation. org is the short Gitea organisation name (e.g. "ttd").
//
// The endpoint requires HTTP POST in Gitea 1.26+ (the GET form was removed).
// Tokens themselves have no time-based expiry. However, each POST atomically
// deactivates every previously-issued token for the same org — Gitea allows
// at most one active org-scoped registration token at a time. Callers must
// therefore mint only when no usable token exists, otherwise any not-yet-
// registered runner using an older Secret value will fail to register.
func (c *Client) MintRegistrationToken(ctx context.Context, org string) (string, error) {
	if org == "" {
		return "", ErrOrgRequired
	}
	endpoint := fmt.Sprintf("%s/api/v1/orgs/%s/actions/runners/registration-token",
		c.baseURL, url.PathEscape(org))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("gitea: build request: %w", err)
	}
	req.Header.Set("Authorization", "token "+c.pat)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gitea: get registration token for %s: %w", org, err)
	}
	defer func() {
		_ = resp.Body.Close() //nolint:errcheck // Closing an HTTP response body after reading does not change the result.
	}()

	switch {
	case resp.StatusCode == http.StatusOK:
		// fall through
	case resp.StatusCode == http.StatusUnauthorized, resp.StatusCode == http.StatusForbidden:
		return "", fmt.Errorf("%w: status %d", ErrUnauthorized, resp.StatusCode)
	case resp.StatusCode == http.StatusNotFound:
		return "", fmt.Errorf("%w: %s", ErrOrgNotFound, org)
	case resp.StatusCode >= http.StatusInternalServerError:
		body := readErrorBody(resp.Body)
		return "", fmt.Errorf("%w: status %d: %s", ErrServer, resp.StatusCode, body)
	default:
		body := readErrorBody(resp.Body)
		return "", fmt.Errorf("%w %d: %s", ErrUnexpected, resp.StatusCode, body)
	}

	var payload struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBody)).Decode(&payload); err != nil {
		return "", fmt.Errorf("gitea: decode response for %s: %w", org, err)
	}
	if payload.Token == "" {
		return "", fmt.Errorf("%w for %s", ErrEmptyToken, org)
	}
	return payload.Token, nil
}

func readErrorBody(r io.Reader) string {
	body, err := io.ReadAll(io.LimitReader(r, maxErrorBody))
	if err != nil {
		return err.Error()
	}
	return string(body)
}
