package runner_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
)

// pods is a sandbox where each pod is gone, or none is.
type pods bool

func (gone pods) PodGone(context.Context, string, string, string) (bool, error) {
	return bool(gone), nil
}

// example is a request to an operator runner in a state, and its answer, from the operator runner's
// examples/protocol.json. The operator runner's route tests check that it gives these answers.
type example struct {
	State   string          `json:"state"`
	Request string          `json:"request"`
	Archive []byte          `json:"archive"`
	Body    json.RawMessage `json:"body"`
	Status  int             `json:"status"`
}

// The client reads each answer of the fake operator runner as it reads the answer in the examples. So a test with the
// fake shows what the operator does with the real operator runner.
func TestTheFakeAnswersAsTheExamplesOfTheProtocol(t *testing.T) {
	RegisterTestingT(t)
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "operator-runner", "examples", "protocol.json"))
	Expect(err).NotTo(HaveOccurred())
	runID := "0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6f"
	replacer := strings.NewReplacer("{runId}", runID, "{otherRunId}", "11111111-2222-3333-4444-555555555555")
	var examples []example
	Expect(json.Unmarshal([]byte(replacer.Replace(string(data))), &examples)).To(Succeed())

	for _, e := range examples {
		host := runnertest.New()
		if e.State != "unclaimed" {
			Expect(ask(host.Server, "PUT /runs/"+runID, []byte{0x1f, 0x8b})).To(Equal([]any{nil}))
		}
		if e.State == runner.StatusCompleted || e.State == runner.StatusFailed {
			// The run ended with the status in the example's answer, and that answer is its result.
			var status runner.Status
			Expect(json.Unmarshal(e.Body, &status)).To(Succeed())
			host.Finish(status, string(e.Body))
		}
		requests := make(chan string, 1)
		replay := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requests <- r.Method + " " + r.URL.RequestURI()
			w.WriteHeader(e.Status)
			if _, err := w.Write(e.Body); err != nil {
				t.Error(err)
			}
		}))
		fromFake, fromExample := ask(host.Server, e.Request, e.Archive), ask(replay, e.Request, e.Archive)
		Expect(fromFake).To(Equal(fromExample), e.State+" "+e.Request)
		Expect(<-requests).To(Equal(e.Request), "the client sends the example's request")
		replay.Close()
		host.Close()
	}
}

// ask sends request with the client, and returns how the client reads the answer.
func ask(server *httptest.Server, request string, archive []byte) []any {
	address, ok := server.Listener.Addr().(*net.TCPAddr)
	Expect(ok).To(BeTrue())
	client := runner.NewClient(http.DefaultClient, address.Port, pods(false))
	method, target, _ := strings.Cut(request, " ")
	endpoint, err := url.Parse(target)
	Expect(err).NotTo(HaveOccurred())
	runID, read, _ := strings.Cut(strings.TrimPrefix(endpoint.Path, "/runs/"), "/")
	pod := runner.Pod{RunID: runID, IP: address.IP.String()}
	switch {
	case method == http.MethodPut:
		body := bytes.NewReader(archive)
		return []any{client.Start(context.Background(), pod, "upgrade-v9", 660*time.Second, body, body.Size())}
	case read == "result":
		body, size, err := client.OpenResult(context.Background(), pod)
		if err != nil {
			return []any{err}
		}
		data, err := io.ReadAll(body)
		return []any{string(data), size, err, body.Close()}
	default:
		status, err := client.Status(context.Background(), pod, 0)
		return []any{status, err}
	}
}

func TestUnreachableRunner(t *testing.T) {
	RegisterTestingT(t)

	host := runnertest.New()
	ip, port := host.Address()
	host.Close()
	client := runner.NewClient(http.DefaultClient, port, pods(false))
	pod := runner.Pod{RunID: "run-1", IP: ip}

	_, err := client.Status(t.Context(), pod, 0)
	Expect(err).To(MatchError(runner.ErrUnreachable))
	err = client.Start(t.Context(), pod, "upgrade-v9", time.Minute, bytes.NewReader(nil), 0)
	Expect(err).To(MatchError(runner.ErrUnreachable))
	Expect(err.Error()).NotTo(ContainSubstring("?"), "logs keep no query string")

	_, err = runner.NewClient(http.DefaultClient, port, pods(true)).Status(t.Context(), pod, 0)
	Expect(err).To(MatchError(runner.ErrGone), "a pod that is gone")
	_, err = client.Status(t.Context(), runner.Pod{RunID: "run-1"}, 0)
	Expect(err).To(MatchError(runner.ErrGone), "a run without a pod")
}
