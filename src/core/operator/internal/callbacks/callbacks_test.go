package callbacks

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/clock"
)

var errTest = errors.New("test failure")

func readContract(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "api", "callbacks", name))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

// The files in api/callbacks are the contract with operator-workflow-engine, whose tests read them too. The payload
// has fields that the operator does not read, which decoding leaves out.
func TestContractPayloadDecodes(t *testing.T) {
	RegisterTestingT(t)

	var payload Payload
	Expect(json.Unmarshal(readContract(t, "payload.json"), &payload)).To(Succeed())

	Expect(payload.CommandKey).To(Equal("run.await-result"))
	Expect(*payload.Payload).To(ContainSubstring("archiveSha256"))
	Expect(payload.Context).To(Equal(Context{
		Domain:    "runs",
		Caller:    "assistant",
		SubjectID: "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b",
	}))
	Expect(payload.WorkflowID).To(Equal("0f8fad5b-d9cb-469f-a165-70867728950e"))
	Expect(payload.ExecutionReferenceTime).To(BeTemporally("==", time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)))
	Expect(*payload.State).To(ContainSubstring("jobName"))
	Expect(*payload.ExecutionDeadline).To(BeTemporally("==", time.Date(2026, 11, 3, 10, 5, 40, 0, time.UTC)))
	Expect(payload.IsFinalWaitCheck).To(BeFalse())

	// The router decodes the same payload.
	router := NewRouter(clock.NewFakeClock(), Group{
		"run.await-result": func(_ context.Context, p *Payload) (Response, error) { return Done(p.State), nil },
	})
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, PathPrefix+"run.await-result",
		bytes.NewReader(readContract(t, "payload.json")))
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
}

func TestContractResponsesEncode(t *testing.T) {
	RegisterTestingT(t)

	state := `{"jobName":"run-4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"}`
	cases := map[string]Response{
		"response-done.json":  Done(&state),
		"response-defer.json": Wait(&state, 5*time.Second, "the command is running"),
	}
	for file, response := range cases {
		encoded, err := json.Marshal(response)
		Expect(err).NotTo(HaveOccurred())
		Expect(encoded).To(MatchJSON(readContract(t, file)), file)

		var decoded Response
		Expect(json.Unmarshal(readContract(t, file), &decoded)).To(Succeed())
		Expect(decoded).To(Equal(response), file)
	}
}

// The engine runs the step's command with this data, and passes the payload back in each callback.
func TestCommandDataEncodes(t *testing.T) {
	RegisterTestingT(t)

	payload := `{"archiveSha256":"abc"}`
	encoded, err := json.Marshal(CommandData{CommandKey: "run.admit", Payload: &payload})
	Expect(err).NotTo(HaveOccurred())
	Expect(encoded).To(MatchJSON(`{"commandKey":"run.admit","payload":"{\"archiveSha256\":\"abc\"}"}`))
}

func newTestRouter(clk clock.Clock) *Router {
	return NewRouter(clk, Group{
		"run.done": func(_ context.Context, p *Payload) (Response, error) {
			return Done(p.State), nil
		},
		"run.wait": func(_ context.Context, p *Payload) (Response, error) {
			return Wait(p.State, 2*time.Second, "waiting"), nil
		},
		"run.permanent": func(context.Context, *Payload) (Response, error) {
			return Response{}, errors.Join(ErrPermanent, errTest)
		},
		"run.expected": func(context.Context, *Payload) (Response, error) {
			return Response{}, errors.Join(ErrExpected, errTest)
		},
		"run.retry": func(context.Context, *Payload) (Response, error) {
			return Response{}, errTest
		},
		"run.deadline": func(ctx context.Context, _ *Payload) (Response, error) {
			deadline, ok := ctx.Deadline()
			if !ok {
				return Response{}, errTest
			}
			text := deadline.Format(time.RFC3339)
			return Done(&text), nil
		},
	})
}

func post(t *testing.T, router http.Handler, key string, payload Payload) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, PathPrefix+key, bytes.NewReader(body))
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	return res
}

func TestRouterAnswersByTheContract(t *testing.T) {
	RegisterTestingT(t)

	router := newTestRouter(clock.NewFakeClock())
	state := "s"

	res := post(t, router, "run.done", Payload{CommandKey: "run.done", State: &state})
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Body.String()).To(MatchJSON(`{"state":"s","defer":null}`))

	res = post(t, router, "run.wait", Payload{CommandKey: "run.wait", State: &state})
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Body.String()).To(MatchJSON(`{"state":"s","defer":{"delay":"00:00:02","reason":"waiting"}}`))

	// 422 is a 4xx other than 408, 418 and 429, so the engine fails the step.
	res = post(t, router, "run.permanent", Payload{CommandKey: "run.permanent"})
	Expect(res.Code).To(Equal(http.StatusUnprocessableEntity))
	Expect(res.Header().Get("Content-Type")).To(Equal("application/problem+json"))

	// An expected end fails the step in the same way.
	res = post(t, router, "run.expected", Payload{CommandKey: "run.expected"})
	Expect(res.Code).To(Equal(http.StatusUnprocessableEntity))

	res = post(t, router, "run.retry", Payload{CommandKey: "run.retry"})
	Expect(res.Code).To(Equal(http.StatusServiceUnavailable))

	res = post(t, router, "run.unknown", Payload{CommandKey: "run.unknown"})
	Expect(res.Code).To(Equal(http.StatusNotFound))

	res = post(t, router, "run.done", Payload{CommandKey: "run.wait"})
	Expect(res.Code).To(Equal(http.StatusBadRequest))

	req := httptest.NewRequestWithContext(
		t.Context(),
		http.MethodPost,
		PathPrefix+"run.done",
		bytes.NewReader([]byte("not json")),
	)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	Expect(rec.Code).To(Equal(http.StatusBadRequest))
}

func TestRouterBoundsTheStepByItsExecutionDeadline(t *testing.T) {
	RegisterTestingT(t)

	clk := clock.NewFakeClockAt(time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC))
	router := newTestRouter(clk)
	deadline := clk.Now().Add(40 * time.Second)

	before := time.Now()
	res := post(t, router, "run.deadline", Payload{CommandKey: "run.deadline", ExecutionDeadline: &deadline})
	Expect(res.Code).To(Equal(http.StatusOK))
	var response Response
	Expect(json.Unmarshal(res.Body.Bytes(), &response)).To(Succeed())
	ctxDeadline, err := time.Parse(time.RFC3339, *response.State)
	Expect(err).NotTo(HaveOccurred())
	Expect(ctxDeadline).To(BeTemporally("~", before.Add(40*time.Second-deadlineMargin), 2*time.Second))
}

func TestRouterServesEveryGroupItIsGiven(t *testing.T) {
	RegisterTestingT(t)

	noop := func(context.Context, *Payload) (Response, error) { return Response{}, nil }
	router := NewRouter(clock.NewFakeClock(),
		Group{"run.admit": noop},
		Group{"maskinporten.ensure-key": noop},
	)
	for _, key := range []string{"run.admit", "maskinporten.ensure-key"} {
		Expect(post(t, router, key, Payload{CommandKey: key}).Code).To(Equal(http.StatusOK), key)
	}
	Expect(post(t, router, "run.cleanup", Payload{CommandKey: "run.cleanup"}).Code).To(Equal(http.StatusNotFound))
}
