package engine_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
)

func TestTimeSpanFormat(t *testing.T) {
	RegisterTestingT(t)

	cases := map[time.Duration]string{
		0:                                    "00:00:00",
		5 * time.Second:                      "00:00:05",
		15 * time.Minute:                     "00:15:00",
		13 * time.Minute:                     "00:13:00",
		26*time.Hour + 3*time.Minute:         "1.02:03:00",
		1500 * time.Millisecond:              "00:00:01.5000000",
		-90 * time.Second:                    "-00:01:30",
		11*time.Minute + 123*time.Nanosecond: "00:11:00.0000001",
	}
	for duration, text := range cases {
		Expect(engine.FormatTimeSpan(duration)).To(Equal(text), duration.String())
	}
}

func TestTimeSpanParse(t *testing.T) {
	RegisterTestingT(t)

	cases := map[string]time.Duration{
		"00:00:05":         5 * time.Second,
		"1.02:03:00":       26*time.Hour + 3*time.Minute,
		"00:00:01.5":       1500 * time.Millisecond,
		"00:00:01.5000000": 1500 * time.Millisecond,
		"-00:01:30":        -90 * time.Second,
		"14.00:00:00":      14 * 24 * time.Hour,
	}
	for text, duration := range cases {
		parsed, err := engine.ParseTimeSpan(text)
		Expect(err).NotTo(HaveOccurred(), text)
		Expect(parsed).To(Equal(duration), text)
	}
	for _, text := range []string{"", "5s", "00:05", "a.00:00:00", "00:00:00.12345678"} {
		_, err := engine.ParseTimeSpan(text)
		Expect(err).To(HaveOccurred(), text)
	}

	var d engine.Duration
	Expect(json.Unmarshal([]byte(`"00:00:05"`), &d)).To(Succeed())
	Expect(time.Duration(d)).To(Equal(5 * time.Second))
	data, err := json.Marshal(engine.Duration(5 * time.Second))
	Expect(err).NotTo(HaveOccurred())
	Expect(string(data)).To(Equal(`"00:00:05"`))
}

func request(archive string) engine.EnqueueRequest {
	data := json.RawMessage(`{"commandKey":"run.admit","payload":"` + archive + `"}`)
	return engine.EnqueueRequest{
		Labels:  map[string]string{"runId": "r"},
		Context: json.RawMessage(`{"caller":"assistant"}`),
		Workflows: []engine.WorkflowRequest{{
			OperationID: "run",
			Steps: []engine.StepRequest{{
				OperationID: "run.admit",
				Command: engine.CommandDefinition{
					Type:       "operator",
					WaitBudget: engine.DurationOf(time.Minute),
					Data:       data,
				},
			}},
		}},
	}
}

func TestClientAgainstTheFakeEngine(t *testing.T) {
	RegisterTestingT(t)

	fake := enginetest.New(time.Now)
	defer fake.Close()
	client := engine.NewClient(fake.URL()+"/", http.DefaultClient)
	ctx := t.Context()

	created, err := client.Enqueue(ctx, "runs-assistant", "key", request("a"))
	Expect(err).NotTo(HaveOccurred())
	Expect(created.Created).To(BeTrue())

	// The context is not part of the idempotency hash.
	replay := request("a")
	replay.Context = json.RawMessage(`{"caller":"assistant","other":1}`)
	again, err := client.Enqueue(ctx, "runs-assistant", "key", replay)
	Expect(err).NotTo(HaveOccurred())
	Expect(again).To(Equal(engine.EnqueueResult{WorkflowID: created.WorkflowID, Created: false}))

	_, err = client.Enqueue(ctx, "runs-assistant", "key", request("b"))
	Expect(err).To(MatchError(engine.ErrConflict))

	workflow, err := client.Get(ctx, "runs-assistant", created.WorkflowID)
	Expect(err).NotTo(HaveOccurred())
	Expect(workflow.OverallStatus).To(Equal(engine.StatusEnqueued))
	Expect(workflow.Steps).To(HaveLen(1))
	Expect(workflow.Labels).To(HaveKeyWithValue("runId", "r"))

	_, err = client.Get(ctx, "runs-designer", created.WorkflowID)
	Expect(err).To(MatchError(engine.ErrNotFound))

	found, err := client.FindByLabels(ctx, "runs-assistant", map[string]string{"runId": "r"}, 1)
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(HaveLen(1))
	found, err = client.FindByLabels(ctx, "runs-assistant", map[string]string{"runId": "other"}, 1)
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(BeEmpty())

	Expect(client.Cancel(ctx, "runs-assistant", created.WorkflowID)).To(Succeed())
	Expect(client.Cancel(ctx, "runs-assistant", created.WorkflowID)).To(Succeed(), "a repeated cancel")
	fake.Update(created.WorkflowID, func(w *engine.Workflow) { w.OverallStatus = engine.StatusCanceled })
	Expect(client.Cancel(ctx, "runs-assistant", created.WorkflowID)).To(MatchError(engine.ErrTerminal))

	// The operator retries an engine at capacity like one that does not answer.
	fake.AtCapacity = true
	_, err = client.Enqueue(ctx, "runs-assistant", "other", request("a"))
	Expect(err).To(MatchError(ContainSubstring("429 at capacity")))
}

// The engine's models are C# records, which ASP.NET Core writes in camel case with string enums. The operator's
// models hold only the fields it reads, so the others must decode without an error.
func TestWorkflowDecodesTheEngineShape(t *testing.T) {
	RegisterTestingT(t)

	body := `{
		"databaseId": "0f8fad5b-d9cb-469f-a165-70867728950e",
		"operationId": "run",
		"idempotencyKey": "k",
		"namespace": "runs-assistant",
		"createdAt": "2026-11-03T10:00:00.1234567+00:00",
		"updatedAt": "2026-11-03T10:05:00+00:00",
		"labels": {"runId": "r"},
		"overallStatus": "Failed",
		"role": "Primary",
		"steps": [{
			"databaseId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
			"operationId": "run.admit",
			"processingOrder": 0,
			"command": {"type": "operator"},
			"status": "Failed",
			"retryCount": 0,
			"deferCount": 300,
			"lastDeferReason": "The run is number 2 in the queue for upgrade-v9.",
			"errorHistory": [{
				"timestamp": "2026-11-03T10:15:00+00:00",
				"message": "Wait budget of 00:15:00 exhausted after 300 deferral(s): queued",
				"httpStatusCode": null,
				"wasRetryable": false
			}]
		}]
	}`
	var workflow engine.Workflow
	Expect(json.Unmarshal([]byte(body), &workflow)).To(Succeed())
	Expect(workflow.OverallStatus).To(Equal(engine.StatusFailed))
	Expect(workflow.OverallStatus.Terminal()).To(BeTrue())
	Expect(workflow.Steps[0].LastError().Message).To(HavePrefix("Wait budget of"))
	Expect(workflow.CreatedAt.Nanosecond()).To(Equal(123456700))
}
