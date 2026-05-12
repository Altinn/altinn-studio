// Package cdn fetches and decodes the Altinn organisations document from
// https://altinncdn.no/orgs/altinn-orgs.json (or an equivalent test URL).
//
// The CDN document is a single JSON object whose top-level "orgs" key maps
// short organisation codes (e.g. "ttd", "brg") to per-org metadata. Only
// fields used downstream are decoded; the rest are silently ignored.
package cdn

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultTimeout   = 30 * time.Second
	defaultUserAgent = "runner-org-sync"
	maxErrorBody     = 512
)

// ErrUnexpectedStatus is returned when the CDN responds with non-2xx.
var ErrUnexpectedStatus = errors.New("cdn: unexpected status")

// Org is one entry from altinn-orgs.json. Code is the map key from the
// document (populated by Fetch, not by the JSON decoder).
type Org struct {
	Code         string            `json:"-"`
	Name         map[string]string `json:"name"`
	Orgnr        string            `json:"orgnr"`
	Environments []string          `json:"environments"`
}

// DisplayName returns the most useful human-readable name available:
// English preferred, any language otherwise, falling back to the code.
// Used for span attributes and log fields, not for reconciliation logic.
func (o Org) DisplayName() string {
	if v, ok := o.Name["en"]; ok && v != "" {
		return v
	}
	for _, v := range o.Name {
		if v != "" {
			return v
		}
	}
	return o.Code
}

// Client fetches the orgs document.
type Client struct {
	httpClient *http.Client
	url        string
	userAgent  string
}

// Option configures a Client.
type Option func(*Client)

// WithHTTPClient overrides the default HTTP client (use in tests with httptest).
func WithHTTPClient(h *http.Client) Option {
	return func(c *Client) { c.httpClient = h }
}

// WithUserAgent overrides the outgoing User-Agent header.
func WithUserAgent(ua string) Option {
	return func(c *Client) { c.userAgent = ua }
}

// NewClient constructs a Client targeting the given URL.
func NewClient(url string, opts ...Option) *Client {
	c := &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
		url:        url,
		userAgent:  defaultUserAgent,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Fetch retrieves the orgs document and returns one Org per entry with the
// org code populated from the map key. Order is not stable.
func (c *Client) Fetch(ctx context.Context) ([]Org, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.url, nil)
	if err != nil {
		return nil, fmt.Errorf("cdn: build request: %w", err)
	}
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cdn: get %s: %w", c.url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBody))
		return nil, fmt.Errorf("%w %d from %s: %s", ErrUnexpectedStatus, resp.StatusCode, c.url, string(body))
	}

	var doc struct {
		Orgs map[string]Org `json:"orgs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, fmt.Errorf("cdn: decode body: %w", err)
	}

	orgs := make([]Org, 0, len(doc.Orgs))
	for code, o := range doc.Orgs {
		o.Code = code
		orgs = append(orgs, o)
	}
	return orgs, nil
}
