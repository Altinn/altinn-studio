package main

import (
	"bytes"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

var errWorkerUnreachable = errors.New("worker unreachable")

type failingTransport struct{}

func (failingTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errWorkerUnreachable
}

func TestCallWorker_LogsRetriesAtInfoAndExhaustionAtError(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	client := &http.Client{Transport: failingTransport{}}
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", nil)
	const maxRetries = 2

	w := httptest.NewRecorder()
	if done := callWorker(
		logger,
		t.Context(),
		client,
		"http://worker/generate",
		r,
		w,
		time.Now(),
		1,
		maxRetries,
		nil,
	); done {
		t.Fatal("callWorker() = true on a retryable failure, want a retry")
	}
	if got := logs.String(); !strings.Contains(got, `level=INFO msg="Worker request failed, will retry"`) {
		t.Errorf("retry log = %q, want it at INFO", got)
	}

	logs.Reset()
	if done := callWorker(
		logger,
		t.Context(),
		client,
		"http://worker/generate",
		r,
		w,
		time.Now(),
		maxRetries,
		maxRetries,
		nil,
	); !done {
		t.Fatal("callWorker() = false on the last attempt, want it to give up")
	}
	if got := logs.String(); !strings.Contains(got, `level=ERROR msg="Error calling PDF worker"`) {
		t.Errorf("last attempt log = %q, want an error", got)
	}
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}
}
