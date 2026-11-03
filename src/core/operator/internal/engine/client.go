// Package engine is a client for the workflow engine that operator-workflow-engine hosts. The API is in
// src/Runtime/workflow-engine/src/WorkflowEngine.Core/Endpoints/EngineEndpoints.cs.
//
// The engine has no authentication of its own: a NetworkPolicy lets only the operator reach it.
package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"altinn.studio/core-operator/internal/problem"
)

var (
	// ErrConflict means the idempotency key was used with another request.
	ErrConflict = errors.New("the idempotency key is in use with another request")
	// ErrNotFound means the namespace has no such workflow.
	ErrNotFound = errors.New("workflow not found")
	// ErrTerminal means the workflow had already finished.
	ErrTerminal = errors.New("the workflow has already finished")
	// ErrInvalid means the engine refused the request, which a retry does not change.
	ErrInvalid = errors.New("the engine refused the request")
	errStatus  = errors.New("unexpected response from the engine")
)

// maxResponseBytes bounds what the operator reads from the engine. A workflow of six steps with its states is far
// smaller.
const maxResponseBytes = 4 << 20

type Client struct {
	http    *http.Client
	baseURL string
}

func NewClient(baseURL string, httpClient *http.Client) *Client {
	return &Client{baseURL: strings.TrimSuffix(baseURL, "/"), http: httpClient}
}

// EnqueueResult is the workflow an enqueue created, or found for a replayed idempotency key.
type EnqueueResult struct {
	WorkflowID string
	Created    bool
}

// Enqueue stores a request of one workflow. The engine answers a replay of the same key and request with the
// existing workflow, and a reuse of the key with another request with ErrConflict.
func (c *Client) Enqueue(
	ctx context.Context,
	namespace string,
	idempotencyKey string,
	request EnqueueRequest,
) (result EnqueueResult, err error) {
	body, err := json.Marshal(request)
	if err != nil {
		return EnqueueResult{}, fmt.Errorf("marshal enqueue request: %w", err)
	}
	endpoint := c.workflowsURL(namespace) + "?" + url.Values{"idempotencyKey": {idempotencyKey}}.Encode()
	res, err := c.do(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return EnqueueResult{}, err
	}
	defer closeBody(res, &err)

	switch res.StatusCode {
	case http.StatusCreated, http.StatusOK:
		var accepted enqueueResponse
		if err := decode(res, &accepted); err != nil {
			return EnqueueResult{}, err
		}
		if len(accepted.Workflows) != 1 {
			return EnqueueResult{}, fmt.Errorf("%w: %d workflows in the answer", errStatus, len(accepted.Workflows))
		}
		return EnqueueResult{
			WorkflowID: accepted.Workflows[0].DatabaseID,
			Created:    res.StatusCode == http.StatusCreated,
		}, nil
	case http.StatusConflict:
		return EnqueueResult{}, fmt.Errorf("%w: %s", ErrConflict, problemDetail(res))
	case http.StatusBadRequest:
		return EnqueueResult{}, fmt.Errorf("%w: %s", ErrInvalid, problemDetail(res))
	default:
		return EnqueueResult{}, unexpected(res)
	}
}

// Get returns a workflow with its steps and their states.
func (c *Client) Get(ctx context.Context, namespace string, workflowID string) (workflow *Workflow, err error) {
	res, err := c.do(ctx, http.MethodGet, c.workflowsURL(namespace)+"/"+url.PathEscape(workflowID), nil)
	if err != nil {
		return nil, err
	}
	defer closeBody(res, &err)

	switch res.StatusCode {
	case http.StatusOK:
		workflow = &Workflow{}
		if err := decode(res, workflow); err != nil {
			return nil, err
		}
		return workflow, nil
	case http.StatusNotFound:
		return nil, ErrNotFound
	default:
		return nil, unexpected(res)
	}
}

// FindByLabels returns the newest workflows in a namespace with all the labels, at most pageSize.
func (c *Client) FindByLabels(
	ctx context.Context,
	namespace string,
	labels map[string]string,
	pageSize int,
) (workflows []Workflow, err error) {
	query := url.Values{"pageSize": {strconv.Itoa(pageSize)}}
	keys := make([]string, 0, len(labels))
	for key := range labels {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		query.Add("label", key+":"+labels[key])
	}
	res, err := c.do(ctx, http.MethodGet, c.workflowsURL(namespace)+"?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}
	defer closeBody(res, &err)

	switch res.StatusCode {
	case http.StatusOK:
		var page listResponse
		if err := decode(res, &page); err != nil {
			return nil, err
		}
		return page.Data, nil
	case http.StatusNoContent:
		return nil, nil
	default:
		return nil, unexpected(res)
	}
}

// Cancel asks the engine to cancel a workflow. A repeated cancel succeeds, and a finished workflow gives ErrTerminal.
func (c *Client) Cancel(ctx context.Context, namespace string, workflowID string) (err error) {
	endpoint := c.workflowsURL(namespace) + "/" + url.PathEscape(workflowID) + "/cancel"
	res, err := c.do(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return err
	}
	defer closeBody(res, &err)

	switch res.StatusCode {
	case http.StatusAccepted, http.StatusOK:
		return nil
	case http.StatusConflict:
		return ErrTerminal
	case http.StatusNotFound:
		return ErrNotFound
	default:
		return unexpected(res)
	}
}

// workflowsURL escapes the namespace, which the engine reads as one path segment.
func (c *Client) workflowsURL(namespace string) string {
	return c.baseURL + "/api/v1/" + url.PathEscape(namespace) + "/workflows"
}

func (c *Client) do(ctx context.Context, method, endpoint string, body []byte) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return nil, fmt.Errorf("build engine request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call the engine: %w", err)
	}
	return res, nil
}

func decode(res *http.Response, target any) error {
	if err := json.NewDecoder(io.LimitReader(res.Body, maxResponseBytes)).Decode(target); err != nil {
		return fmt.Errorf("decode engine response: %w", err)
	}
	return nil
}

func problemDetail(res *http.Response) string {
	var details problem.Details
	data, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes))
	if err != nil {
		return "(the body could not be read: " + err.Error() + ")"
	}
	if json.Unmarshal(data, &details) == nil && (details.Detail != "" || details.Title != "") {
		return strings.TrimSpace(details.Title + " " + details.Detail)
	}
	return strings.TrimSpace(string(data))
}

func unexpected(res *http.Response) error {
	return fmt.Errorf("%w: %s %s: %d %s", errStatus, res.Request.Method, res.Request.URL.Path, res.StatusCode,
		problemDetail(res))
}

// closeBody drains and closes a response body, so the connection is reused. Its error becomes the call's error only
// when the call has none of its own.
func closeBody(res *http.Response, err *error) {
	_, drainErr := io.Copy(io.Discard, io.LimitReader(res.Body, maxResponseBytes))
	closeErr := res.Body.Close()
	if *err == nil {
		if failure := errors.Join(drainErr, closeErr); failure != nil {
			*err = fmt.Errorf("read the engine's response: %w", failure)
		}
	}
}
