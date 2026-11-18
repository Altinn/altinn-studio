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
	data, err := os.ReadFile(filepath.Join("..", "..", "testdata", "callbacks", name))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

// The payload has fields that the operator does not read, which decoding leaves out.
func TestContractPayloadDecodes(t *testing.T) {
	RegisterTestingT(t)

	var payload Payload
	Expect(json.Unmarshal(readContract(t, "payload.json"), &payload)).To(Succeed())

	Expect(payload.CommandKey).To(Equal("run.await-result"))
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
	res := postBody(t, router, "run.await-result", readContract(t, "payload.json"))
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

// The engine runs the step's command with this data.
func TestCommandDataEncodes(t *testing.T) {
	RegisterTestingT(t)

	encoded, err := json.Marshal(CommandData{CommandKey: "run.admit"})
	Expect(err).NotTo(HaveOccurred())
	Expect(encoded).To(MatchJSON(`{"commandKey":"run.admit"}`))
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
			return Response{}, &End{Err: errTest, Reason: "queue-timeout", Detail: queueTimeout}
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
	return postBody(t, router, key, body)
}

func postBody(t *testing.T, router http.Handler, key string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, PathPrefix+key, bytes.NewReader(body))
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	return res
}

const queueTimeout = "The run waited in the queue longer than its kind allows."

func TestRouterAnswersByTheContract(t *testing.T) {
	router := newTestRouter(clock.NewFakeClock())
	state := "s"

	t.Run("a step that is done answers 200 with its state", func(t *testing.T) {
		RegisterTestingT(t)
		res := post(t, router, "run.done", Payload{CommandKey: "run.done", State: &state})
		Expect(res.Code).To(Equal(http.StatusOK))
		Expect(res.Body.String()).To(MatchJSON(`{"state":"s","defer":null}`))
	})
	t.Run("a step that waits answers 200 with a defer", func(t *testing.T) {
		RegisterTestingT(t)
		res := post(t, router, "run.wait", Payload{CommandKey: "run.wait", State: &state})
		Expect(res.Code).To(Equal(http.StatusOK))
		Expect(res.Body.String()).To(MatchJSON(`{"state":"s","defer":{"delay":"00:00:02","reason":"waiting"}}`))
	})
	// The engine does not retry a 422, and records the answer as the step's error, where a status read finds it.
	t.Run("a step that ends answers 422 with a problem", func(t *testing.T) {
		RegisterTestingT(t)
		res := post(t, router, "run.permanent", Payload{CommandKey: "run.permanent"})
		Expect(res.Code).To(Equal(http.StatusUnprocessableEntity))
		Expect(res.Header().Get("Content-Type")).To(Equal("application/problem+json"))
		Expect(res.Body.String()).To(MatchJSON(readContract(t, "response-end.json")))
	})
	t.Run("a step that fails answers 503, so the engine retries it", func(t *testing.T) {
		RegisterTestingT(t)
		Expect(post(t, router, "run.retry", Payload{CommandKey: "run.retry"}).Code).
			To(Equal(http.StatusServiceUnavailable))
	})
	t.Run("an unknown command key answers 404", func(t *testing.T) {
		RegisterTestingT(t)
		Expect(post(t, router, "run.unknown", Payload{CommandKey: "run.unknown"}).Code).To(Equal(http.StatusNotFound))
	})
	t.Run("a payload for another command key answers 400", func(t *testing.T) {
		RegisterTestingT(t)
		Expect(post(t, router, "run.done", Payload{CommandKey: "run.wait"}).Code).To(Equal(http.StatusBadRequest))
	})
	t.Run("a body that is not JSON answers 400", func(t *testing.T) {
		RegisterTestingT(t)
		Expect(postBody(t, router, "run.done", []byte("not json")).Code).To(Equal(http.StatusBadRequest))
	})
}

func TestEndedReadsTheEndThatAStepAnswered(t *testing.T) {
	RegisterTestingT(t)
	router := newTestRouter(clock.NewFakeClock())

	ended := post(t, router, "run.permanent", Payload{CommandKey: "run.permanent"}).Body.String()
	Expect(Ended(ended)).To(Equal(&End{Reason: "queue-timeout", Detail: queueTimeout}))
	failed := post(t, router, "run.retry", Payload{CommandKey: "run.retry"}).Body.String()
	Expect(Ended(failed)).To(BeNil(), "a step that failed")
	engineError := "Wait budget of 00:15:00 exhausted after 300 deferral(s): queued"
	Expect(Ended(engineError)).To(BeNil(), "the engine's own error")
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

	late := clk.Now().Add(deadlineMargin)
	res = post(t, router, "run.deadline", Payload{CommandKey: "run.deadline", ExecutionDeadline: &late})
	Expect(res.Code).To(Equal(http.StatusOK), "a step with no time left has a deadline too")
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
