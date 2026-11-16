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
	// ErrUnreachable means the request did not get an answer, but the pod is there, so a repeat may get one.
	ErrUnreachable = errors.New("the operator runner did not answer")
	// ErrGone means the run's pod is gone, or the run has none, so its operator runner can never answer.
	ErrGone = errors.New("the run's pod is gone")
	// ErrNotClaimed means the run has not claimed the operator runner: no archive has arrived for it.
	ErrNotClaimed = errors.New("the run has not claimed the operator runner")
	// ErrRejected means the operator runner refused the request, and a repeat gets the same answer, such as for a pod
	// that another run has claimed. The error is a *RejectedError, which has the operator runner's status and detail.
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

// Pod is the pod of a run, where the run's operator runner listens.
type Pod struct {
	Namespace string
	RunID     string
	// IP is empty for a run that has no pod.
	IP string
}

// Pods tells whether a run's pod has stopped or disappeared, as sandbox.Sandbox does.
type Pods interface {
	PodGone(ctx context.Context, namespace, runID, ip string) (bool, error)
}

type Client struct {
	http *http.Client
	pods Pods
	port int
}

func NewClient(httpClient *http.Client, port int, pods Pods) *Client {
	return &Client{http: httpClient, port: port, pods: pods}
}

func (c *Client) runURL(pod Pod) string {
	return "http://" + net.JoinHostPort(pod.IP, strconv.Itoa(c.port)) + "/runs/" + url.PathEscape(pod.RunID)
}

// Start sends the archive and starts the command. The operator runner answers 202 for the run it has, also when the
// archive comes again, which it then discards. size is -1 when it is not known.
func (c *Client) Start(ctx context.Context, pod Pod, command string, archive io.Reader, size int64) (err error) {
	endpoint := c.runURL(pod) + "?" + url.Values{"command": {command}}.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, endpoint, archive)
	if err != nil {
		return fmt.Errorf("build start request: %w", err)
	}
	req.ContentLength = size
	req.Header.Set("Content-Type", "application/gzip")
	res, err := c.do(pod, req)
	if err != nil {
		return err
	}
	defer closeBody(res, &err)

	if res.StatusCode != http.StatusAccepted {
		return failure(res)
	}
	return nil
}

// Status reads the run's status. While the command runs, the operator runner waits up to wait for its end.
func (c *Client) Status(ctx context.Context, pod Pod, wait time.Duration) (status *Status, err error) {
	res, err := c.get(ctx, pod, c.runURL(pod)+"?wait="+strconv.Itoa(int(wait.Seconds())))
	if err != nil {
		return nil, err
	}
	defer closeBody(res, &err)

	if res.StatusCode != http.StatusOK {
		return nil, failure(res)
	}
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
}

// OpenResult opens the result of an ended run, to pass it on as it is. This is the fetch: the operator runner keeps the
// result for a grace after it, and then exits. The caller closes the body. size is -1 when the operator runner did not
// say.
func (c *Client) OpenResult(ctx context.Context, pod Pod) (body io.ReadCloser, size int64, err error) {
	res, err := c.get(ctx, pod, c.runURL(pod)+"/result")
	if err != nil {
		return nil, 0, err
	}
	if res.StatusCode == http.StatusOK {
		return res.Body, res.ContentLength, nil
	}
	defer closeBody(res, &err)
	return nil, 0, failure(res)
}

func (c *Client) get(ctx context.Context, pod Pod, endpoint string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	return c.do(pod, req)
}

// do sends a request to the operator runner in pod. A request that gets no answer fails with ErrGone once the pod is
// gone, and with ErrUnreachable while it is there, since the operator runner may then answer a repeat.
func (c *Client) do(pod Pod, req *http.Request) (*http.Response, error) {
	if pod.IP == "" {
		return nil, fmt.Errorf("%w: the run has no pod IP", ErrGone)
	}
	res, err := c.http.Do(req)
	if err == nil {
		return res, nil
	}
	if gone, podErr := c.pods.PodGone(req.Context(), pod.Namespace, pod.RunID, pod.IP); podErr == nil && gone {
		return nil, fmt.Errorf("%w: %w", ErrGone, err)
	}
	return nil, fmt.Errorf("%w: %w", ErrUnreachable, err)
}

// failure is the error for an answer that the request does not expect. A 404 to a read means that the run has not
// claimed the operator runner, and to a start that the operator runner has no such command.
func failure(res *http.Response) error {
	switch {
	case res.StatusCode == http.StatusNotFound && res.Request.Method == http.MethodGet:
		return ErrNotClaimed
	case isPermanent(res.StatusCode):
		return rejection(res)
	}
	return fmt.Errorf("%w: %d %s", errStatus, res.StatusCode, readSnippet(res))
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
