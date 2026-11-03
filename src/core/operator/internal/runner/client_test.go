package runner_test

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"testing"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
)

func TestStartStatusAndResult(t *testing.T) {
	RegisterTestingT(t)

	host := runnertest.New()
	defer host.Close()
	ip, port := host.Address()
	client := runner.NewClient(http.DefaultClient, port)
	ctx := t.Context()
	archive := []byte{0x1f, 0x8b, 1, 2, 3}

	_, err := client.Status(ctx, ip, "run-1", 0)
	Expect(err).To(MatchError(runner.ErrNotClaimed), "no archive yet")

	Expect(client.Start(ctx, ip, "run-1", "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))).To(Succeed())
	Expect(client.Start(ctx, ip, "run-1", "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))).
		To(Succeed(), "the same run again")
	err = client.Start(ctx, ip, "run-2", "upgrade-v9", bytes.NewReader(archive), int64(len(archive)))
	Expect(err).To(MatchError(runner.ErrConflict))

	runID, command, received, starts := host.Snapshot()
	Expect(runID).To(Equal("run-1"))
	Expect(command).To(Equal("upgrade-v9"))
	Expect(received).To(Equal(archive))
	Expect(starts).To(Equal(2))

	status, err := client.Status(ctx, ip, "run-1", 0)
	Expect(err).NotTo(HaveOccurred())
	Expect(status.Status).To(Equal(runner.StatusRunning))

	exitCode := 0
	result := `{"status":"completed","exitCode":0,"timedOut":false,"stdout":"ok","stderr":"","report":null,"patch":null}`
	host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: &exitCode}, result)
	status, err = client.Status(ctx, ip, "run-1", 0)
	Expect(err).NotTo(HaveOccurred())
	Expect(status.Status).To(Equal(runner.StatusCompleted))
	Expect(*status.ExitCode).To(Equal(0))
	Expect(host.FetchCount()).To(BeZero(), "a status read is not a fetch")

	body, size, err := client.OpenResult(ctx, ip, "run-1")
	Expect(err).NotTo(HaveOccurred())
	data, err := io.ReadAll(body)
	Expect(err).NotTo(HaveOccurred())
	Expect(body.Close()).To(Succeed())
	Expect(string(data)).To(Equal(result))
	Expect(size).To(Equal(int64(len(result))))
	Expect(host.FetchCount()).To(Equal(1))

	_, _, err = client.OpenResult(ctx, ip, "run-2")
	Expect(err).To(MatchError(runner.ErrNotClaimed), "a run the operator runner does not know")
}

func TestStartPassesOnTheRunnersRefusal(t *testing.T) {
	RegisterTestingT(t)

	host := runnertest.New()
	defer host.Close()
	ip, port := host.Address()
	client := runner.NewClient(http.DefaultClient, port)

	err := client.Start(t.Context(), ip, "run-1", "upgrade-v9", bytes.NewReader([]byte("app")), 3)

	Expect(err).To(MatchError(runner.ErrRejected))
	var rejection *runner.RejectedError
	Expect(errors.As(err, &rejection)).To(BeTrue())
	Expect(rejection.Status).To(Equal(http.StatusBadRequest))
	Expect(rejection.Detail).To(Equal("The body is not a gzip archive."))
}

func TestUnreachableRunner(t *testing.T) {
	RegisterTestingT(t)

	host := runnertest.New()
	ip, port := host.Address()
	host.Close()
	client := runner.NewClient(http.DefaultClient, port)

	_, err := client.Status(t.Context(), ip, "run-1", 0)
	Expect(err).To(MatchError(runner.ErrUnreachable))
	_, _, err = client.OpenResult(t.Context(), ip, "run-1")
	Expect(err).To(MatchError(runner.ErrUnreachable))
	err = client.Start(t.Context(), ip, "run-1", "upgrade-v9", bytes.NewReader(nil), 0)
	Expect(err).To(MatchError(runner.ErrUnreachable))
}
