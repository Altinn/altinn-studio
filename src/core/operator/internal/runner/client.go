// Package runner is a client for the operator runner in the pod of a run Job (src/core/operator-runner). The operator
// runner keeps one run per pod, and it keeps the result until the caller fetches it. So the operator can repeat each
// call after a restart.
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

// maxStatusBytes limits a status, which has no output.
const maxStatusBytes = 64 << 10

// maxDrainBytes limits what the client reads of a body that it does not use, so that the client can reuse the
// connection.
const maxDrainBytes = 1 << 20

var (
	// ErrUnreachable means that the request got no answer, but the pod is there. A repeat can get an answer.
	ErrUnreachable = errors.New("the operator runner did not answer")
	// ErrGone means the run's pod is gone, or the run has none, so its operator runner can never answer.
	ErrGone = errors.New("the run's pod is gone")
	// ErrNotClaimed means that the run did not claim the operator runner, because no archive arrived for it.
	ErrNotClaimed = errors.New("the run has not claimed the operator runner")
	// ErrRejected means that the operator runner refused the request, and a repeat gets the same answer. An example is
	// a pod that another run claimed. The error is a *RejectedError, with the problem of the operator runner.
	ErrRejected = errors.New("the operator runner refused the request")
	errStatus   = errors.New("unexpected response from the operator runner")
)

// The reasons in the operator runner's problems that the operator tells apart.
const (
	ReasonNotClaimed = "not-claimed"
	// ReasonInvalidArchive means that the caller must send another archive.
	ReasonInvalidArchive = "invalid-archive"
)

// RejectedError is the operator runner's answer to a request that a repeat cannot change, such as an archive that is
// too large.
type RejectedError struct {
	Reason string
	Detail string
	Status int
}

func (r *RejectedError) Error() string {
	return fmt.Sprintf("%s: %d %s", ErrRejected, r.Status, r.Detail)
}

func (r *RejectedError) Unwrap() error {
	return ErrRejected
}

const (
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// Status is the answer of the operator runner to a status request. It has the status of the run without its output. A
// status read is not a fetch of the result.
type Status struct {
	ExitCode *int   `json:"exitCode"`
	Status   string `json:"status"`
	// Error has a value only if Status is failed.
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

// Pods reports whether the pod of a run stopped or is not there anymore, as sandbox.Sandbox does.
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

// Start sends the archive and starts the command for at most timeout. The operator runner answers 202 for its run, also
// if the archive comes again. It then discards the second archive. size is -1 if the size is not known.
func (c *Client) Start(
	ctx context.Context, pod Pod, command string, timeout time.Duration, archive io.Reader, size int64,
) (err error) {
	query := url.Values{"command": {command}, "timeout": {strconv.Itoa(int(timeout.Seconds()))}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.runURL(pod)+"?"+query.Encode(), archive)
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

// OpenResult opens the result of an ended run, to forward it without change. This call is the fetch. After it, the
// operator runner keeps the result for a grace time and then exits. The caller must close the body. size is -1 if the
// operator runner did not give it.
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

// do sends a request to the operator runner in pod. A request that gets no answer fails with ErrGone if the pod is
// gone. It fails with ErrUnreachable while the pod is there, because the operator runner can then answer a repeat.
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

// failure is the error for an answer that the request does not expect.
func failure(res *http.Response) error {
	text := readSnippet(res)
	var details problem.Details
	if json.Unmarshal([]byte(text), &details) == nil && details.Detail != "" {
		text = details.Detail
	}
	switch {
	case details.Reason == ReasonNotClaimed:
		return ErrNotClaimed
	case isPermanent(res.StatusCode):
		return &RejectedError{Reason: details.Reason, Detail: text, Status: res.StatusCode}
	}
	return fmt.Errorf("%w: %d %s", errStatus, res.StatusCode, text)
}

// isPermanent reports whether the operator runner gives the same answer to a repeat. That is a 4xx other than 408 (a
// body that came too slowly) and 429.
func isPermanent(status int) bool {
	return status >= 400 && status < 500 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests
}

func readSnippet(res *http.Response) string {
	data, err := io.ReadAll(io.LimitReader(res.Body, 1024))
	if err != nil {
		return "(the body could not be read: " + err.Error() + ")"
	}
	return string(data)
}

// closeBody drains and closes a response body, so that the client can reuse the connection. Its error becomes the error
// of the call only if the call has no error of its own.
func closeBody(res *http.Response, err *error) {
	_, drainErr := io.Copy(io.Discard, io.LimitReader(res.Body, maxDrainBytes))
	closeErr := res.Body.Close()
	if *err == nil {
		if failure := errors.Join(drainErr, closeErr); failure != nil {
			*err = fmt.Errorf("%w: %w", ErrUnreachable, failure)
		}
	}
}
