// Package runner is a client for the operator runner in the pod of a run Job (src/core/operator-runner). The operator
// passes the caller's archive on to the operator runner, reads the run's status until it ends, and passes the result on
// to the caller. The operator runner keeps one run per pod and keeps its result until the caller has fetched it, so
// each call can be repeated after a restart of the operator.
package runner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"altinn.studio/core-operator/internal/problem"
)

// Port is the operator runner's HTTP port in the PodTemplate.
const Port = 8080

// maxStatusBytes bounds a status, which holds no output.
const maxStatusBytes = 64 << 10

// maxDrainBytes bounds what the client reads of a body it does not use, so the connection can be reused.
const maxDrainBytes = 1 << 20

var (
	// ErrUnreachable means the request did not get an answer. The pod may be gone.
	ErrUnreachable = errors.New("the operator runner did not answer")
	// ErrConflict means the operator runner has another run, so this run cannot start in the pod.
	ErrConflict = errors.New("the operator runner has another run")
	// ErrNotClaimed means the run has not claimed the operator runner: no archive has arrived for it.
	ErrNotClaimed = errors.New("the run has not claimed the operator runner")
	// ErrRejected means the operator runner refused the request, and a repeat gets the same answer. The error is a
	// *RejectedError, which has the operator runner's status and detail.
	ErrRejected = errors.New("the operator runner refused the request")
	errStatus   = errors.New("unexpected response from the operator runner")
)

// RejectedError is the operator runner's answer to a request that a repeat cannot change, such as an archive that is
// too large.
type RejectedError struct {
	Detail string
	Status int
}

func (r *RejectedError) Error() string {
	return fmt.Sprintf("%s: %d %s", ErrRejected, r.Status, r.Detail)
}

func (r *RejectedError) Unwrap() error {
	return ErrRejected
}

// Result statuses.
const (
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// Status is the operator runner's answer to a status request: the run's status without its output. Reading it does not
// count as fetching the result.
type Status struct {
	ExitCode *int   `json:"exitCode"`
	Status   string `json:"status"`
	// Error is set when Status is failed.
	Error    string `json:"error,omitempty"`
	TimedOut bool   `json:"timedOut"`
}

type Client struct {
	http *http.Client
	port int
}

func NewClient(httpClient *http.Client, port int) *Client {
	return &Client{http: httpClient, port: port}
}

func (c *Client) runURL(podIP, runID string) string {
	return "http://" + net.JoinHostPort(podIP, strconv.Itoa(c.port)) + "/runs/" + url.PathEscape(runID)
}

// Start sends the archive and starts the command. The operator runner answers 202 for the run it has, also when the
// archive comes again, which it then discards. size is -1 when it is not known.
func (c *Client) Start(ctx context.Context, podIP, runID, command string, archive io.Reader, size int64) (err error) {
	endpoint := c.runURL(podIP, runID) + "?" + url.Values{"command": {command}}.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, endpoint, archive)
	if err != nil {
		return fmt.Errorf("build start request: %w", err)
	}
	req.ContentLength = size
	req.Header.Set("Content-Type", "application/gzip")
	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrUnreachable, err)
	}
	defer closeBody(res, &err)

	switch {
	case res.StatusCode == http.StatusAccepted:
		return nil
	case res.StatusCode == http.StatusConflict:
		return fmt.Errorf("%w: %s", ErrConflict, readSnippet(res))
	case isPermanent(res.StatusCode):
		return rejection(res)
	default:
		return fmt.Errorf("%w: %d %s", errStatus, res.StatusCode, readSnippet(res))
	}
}

// Status reads the run's status. While the command runs, the operator runner waits up to wait for its end.
func (c *Client) Status(ctx context.Context, podIP, runID string, wait time.Duration) (status *Status, err error) {
	endpoint := c.runURL(podIP, runID) + "?wait=" + strconv.Itoa(int(wait.Seconds()))
	res, err := c.get(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer closeBody(res, &err)

	switch {
	case res.StatusCode == http.StatusOK:
		status = &Status{}
		if err := json.NewDecoder(io.LimitReader(res.Body, maxStatusBytes)).Decode(status); err != nil {
			return nil, fmt.Errorf("%w: decode status: %w", errStatus, err)
		}
		switch status.Status {
		case StatusRunning, StatusCompleted, StatusFailed:
			return status, nil
		default:
			return nil, fmt.Errorf("%w: status %q", errStatus, status.Status)
		}
	case res.StatusCode == http.StatusNotFound:
		return nil, ErrNotClaimed
	case isPermanent(res.StatusCode):
		return nil, rejection(res)
	default:
		return nil, fmt.Errorf("%w: %d %s", errStatus, res.StatusCode, readSnippet(res))
	}
}

// OpenResult opens the result of an ended run, to pass it on as it is. This is the fetch: the operator runner keeps the
// result for a grace after it, and then exits. The caller closes the body. size is -1 when the operator runner did not
// say.
func (c *Client) OpenResult(ctx context.Context, podIP, runID string) (body io.ReadCloser, size int64, err error) {
	res, err := c.get(ctx, c.runURL(podIP, runID)+"/result")
	if err != nil {
		return nil, 0, err
	}
	if res.StatusCode == http.StatusOK {
		return res.Body, res.ContentLength, nil
	}
	defer closeBody(res, &err)

	switch {
	case res.StatusCode == http.StatusNotFound:
		return nil, 0, ErrNotClaimed
	case isPermanent(res.StatusCode):
		return nil, 0, rejection(res)
	default:
		return nil, 0, fmt.Errorf("%w: %d %s", errStatus, res.StatusCode, readSnippet(res))
	}
}

func (c *Client) get(ctx context.Context, endpoint string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrUnreachable, err)
	}
	return res, nil
}

// isPermanent follows the engine's rule: a 4xx other than 408 and 429 does not change on a retry.
func isPermanent(status int) bool {
	return status >= 400 && status < 500 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests
}

// rejection reads the detail of the operator runner's problem, which the operator may pass on to the caller.
func rejection(res *http.Response) *RejectedError {
	text := readSnippet(res)
	var details problem.Details
	if json.Unmarshal([]byte(text), &details) == nil && details.Detail != "" {
		text = details.Detail
	}
	return &RejectedError{Status: res.StatusCode, Detail: text}
}

func readSnippet(res *http.Response) string {
	data, err := io.ReadAll(io.LimitReader(res.Body, 1024))
	if err != nil {
		return "(the body could not be read: " + err.Error() + ")"
	}
	return string(data)
}

// closeBody drains and closes a response body, so the connection is reused. Its error becomes the call's error only
// when the call has none of its own.
func closeBody(res *http.Response, err *error) {
	_, drainErr := io.Copy(io.Discard, io.LimitReader(res.Body, maxDrainBytes))
	closeErr := res.Body.Close()
	if *err == nil {
		if failure := errors.Join(drainErr, closeErr); failure != nil {
			*err = fmt.Errorf("%w: %w", ErrUnreachable, failure)
		}
	}
}
