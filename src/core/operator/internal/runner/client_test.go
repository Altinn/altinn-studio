package runner_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"testing"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
)

// pods is a sandbox where each pod is gone, or none is.
type pods bool

func (gone pods) PodGone(context.Context, string, string, string) (bool, error) {
	return bool(gone), nil
}

func TestStartStatusAndResult(t *testing.T) {
	RegisterTestingT(t)

	host := runnertest.New()
	defer host.Close()
	ip, port := host.Address()
	client := runner.NewClient(http.DefaultClient, port, pods(false))
	ctx := t.Context()
	archive := []byte{0x1f, 0x8b, 1, 2, 3}
	pod, other := runner.Pod{RunID: "run-1", IP: ip}, runner.Pod{RunID: "run-2", IP: ip}

	_, err := client.Status(ctx, pod, 0)
	Expect(err).To(MatchError(runner.ErrNotClaimed), "no archive yet")

	Expect(client.Start(ctx, pod, "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))).To(Succeed())
	Expect(client.Start(ctx, pod, "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))).
		To(Succeed(), "the same run again")
	err = client.Start(ctx, other, "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))
	var rejection *runner.RejectedError
	Expect(errors.As(err, &rejection)).To(BeTrue(), "another run's pod")
	Expect(*rejection).To(Equal(runner.RejectedError{Status: http.StatusConflict,
		Detail: "Another run has claimed this operator runner."}))

	runID, command, received, starts := host.Snapshot()
	Expect(runID).To(Equal("run-1"))
	Expect(command).To(Equal("upgrade-v9"))
	Expect(received).To(Equal(archive))
	Expect(starts).To(Equal(2))

	status, err := client.Status(ctx, pod, 0)
	Expect(err).NotTo(HaveOccurred())
	Expect(status.Status).To(Equal(runner.StatusRunning))

	exitCode := 0
	result := `{"status":"completed","exitCode":0,"timedOut":false,"stdout":"ok","stderr":"","report":null,"patch":null}`
	host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: &exitCode}, result)
	status, err = client.Status(ctx, pod, 0)
	Expect(err).NotTo(HaveOccurred())
	Expect(status.Status).To(Equal(runner.StatusCompleted))
	Expect(*status.ExitCode).To(Equal(0))
	Expect(host.FetchCount()).To(BeZero(), "a status read is not a fetch")

	body, size, err := client.OpenResult(ctx, pod)
	Expect(err).NotTo(HaveOccurred())
	data, err := io.ReadAll(body)
	Expect(err).NotTo(HaveOccurred())
	Expect(body.Close()).To(Succeed())
	Expect(string(data)).To(Equal(result))
	Expect(size).To(Equal(int64(len(result))))
	Expect(host.FetchCount()).To(Equal(1))

	_, _, err = client.OpenResult(ctx, other)
	Expect(err).To(MatchError(runner.ErrNotClaimed), "a run the operator runner does not know")
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
	err = client.Start(t.Context(), pod, "upgrade-v9", bytes.NewReader(nil), 0)
	Expect(err).To(MatchError(runner.ErrUnreachable))

	_, err = runner.NewClient(http.DefaultClient, port, pods(true)).Status(t.Context(), pod, 0)
	Expect(err).To(MatchError(runner.ErrGone), "a pod that is gone")
	_, err = client.Status(t.Context(), runner.Pod{RunID: "run-1"}, 0)
	Expect(err).To(MatchError(runner.ErrGone), "a run without a pod")
}
