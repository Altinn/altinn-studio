// Package frontdoor is a client of the localtest-v2 front door's API, which the localtest container serves on the
// public origin (http://local.altinn.cloud:8000/localtest/api/...): the apps registered with it and the frontend dev
// server's route. studioctl-server registers the apps (Discovery/FrontDoorRegistration.cs); studioctl reads the
// registrations and sets the dev-server route.
package frontdoor

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	appsPath      = "/localtest/api/apps"
	devServerPath = "/localtest/api/routes/frontend-dev-server"

	// hostGatewayName is how the front door, in a container, reaches the host: the container runtime's host gateway.
	hostGatewayName = "host.docker.internal"

	requestTimeout = 5 * time.Second
	pollInterval   = 500 * time.Millisecond
	// clockSlack allows for the container's clock against the host's when comparing provisioning times.
	clockSlack = time.Second

	provisioningSucceeded = "succeeded"
)

var (
	// ErrUnreachable is returned when the front door does not answer at all.
	ErrUnreachable = errors.New("the localtest-v2 front door does not answer")
	// ErrRefused is returned when the front door answers a request with an error status.
	ErrRefused = errors.New("the localtest-v2 front door refused the request")
)

// AppURL is the address of an app on the host's port as the front door reaches it.
func AppURL(port int) string {
	return "http://" + hostGatewayName + ":" + strconv.Itoa(port)
}

// App is one entry of GET localtest/api/apps.
type App struct {
	Provisioning *Provisioning `json:"provisioning"`
	Org          string        `json:"org"`
	App          string        `json:"app"`
	URL          string        `json:"url"`
}

// Provisioning is the result of the front door's last provisioning of an app.
type Provisioning struct {
	At    time.Time `json:"at"`
	State string    `json:"state"`
	Error string    `json:"error"`
}

// Client calls the front door on the public origin.
type Client struct {
	http    *http.Client
	baseURL string
}

// NewClient returns a client of the front door at localtestURL, the public origin (http://local.altinn.cloud:8000).
func NewClient(localtestURL string) *Client {
	return &Client{http: &http.Client{Timeout: requestTimeout}, baseURL: strings.TrimRight(localtestURL, "/")}
}

// Apps lists the apps registered with the front door.
func (c *Client) Apps(ctx context.Context) ([]App, error) {
	resp, err := c.do(ctx, http.MethodGet, appsPath, nil)
	if err != nil {
		return nil, err
	}
	defer closeBody(resp)
	var apps []App
	if err := json.NewDecoder(resp.Body).Decode(&apps); err != nil {
		return nil, fmt.Errorf("decode GET %s: %w", c.baseURL+appsPath, err)
	}
	return apps, nil
}

// WaitForApp polls the registrations until the front door lists org/app at url with a provisioning that succeeded at
// or after since. It returns when ctx ends with ctx's error joined with what the front door last had, as the error's
// text: "not registered", "registered at <url>", "provisioning failed: <error>", or why the front door did not answer.
func (c *Client) WaitForApp(ctx context.Context, org, app, url string, since time.Time) error {
	var last error
	for {
		apps, err := c.Apps(ctx)
		if err == nil {
			var done bool
			done, err = registered(apps, org, app, url, since.Add(-clockSlack))
			if done {
				return nil
			}
		}
		last = err
		select {
		case <-ctx.Done():
			return errors.Join(ctx.Err(), last)
		case <-time.After(pollInterval):
		}
	}
}

var (
	errNotRegistered = errors.New("not registered")
	errOtherURL      = errors.New("registered at another address")
	errProvisioning  = errors.New("registered, provisioning")
	errStale         = errors.New("registered, provisioned before this run")
	errFailed        = errors.New("provisioning")
)

// registered reports whether apps has org/app at url, provisioned since; otherwise the error says what it has.
func registered(apps []App, org, app, url string, since time.Time) (bool, error) {
	for _, entry := range apps {
		if entry.Org != org || entry.App != app {
			continue
		}
		p := entry.Provisioning
		switch {
		case entry.URL != url:
			return false, fmt.Errorf("%w: %s", errOtherURL, entry.URL)
		case p == nil:
			return false, errProvisioning
		case p.At.Before(since):
			return false, errStale
		case p.State != provisioningSucceeded:
			return false, fmt.Errorf("%w %s: %s", errFailed, p.State, p.Error)
		}
		return true, nil
	}
	return false, errNotRegistered
}

// PutFrontendDevServer routes the frontend dev server host to url.
func (c *Client) PutFrontendDevServer(ctx context.Context, url string) error {
	body, err := json.Marshal(struct {
		URL string `json:"url"`
	}{URL: url})
	if err != nil {
		return fmt.Errorf("encode the frontend dev server route: %w", err)
	}
	resp, err := c.do(ctx, http.MethodPut, devServerPath, body)
	if err != nil {
		return err
	}
	closeBody(resp)
	return nil
}

// DeleteFrontendDevServer removes the frontend dev server's route.
func (c *Client) DeleteFrontendDevServer(ctx context.Context) error {
	resp, err := c.do(ctx, http.MethodDelete, devServerPath, nil)
	if err != nil {
		return err
	}
	closeBody(resp)
	return nil
}

// do sends a request and returns the response of a 2xx answer; any other answer is ErrRefused, no answer
// ErrUnreachable.
func (c *Client) do(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	target := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %s %s: %w", ErrUnreachable, method, target, err)
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		closeBody(resp)
		return nil, fmt.Errorf("%w: %s %s: HTTP %d", ErrRefused, method, target, resp.StatusCode)
	}
	return resp, nil
}

func closeBody(resp *http.Response) {
	ignoreError(resp.Body.Close())
}

func ignoreError(error) {}
