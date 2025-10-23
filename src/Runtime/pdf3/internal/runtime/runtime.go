package runtime

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"testing"
	"time"
)

var IsTestInternalsMode bool = os.Getenv("TEST_INTERNALS_MODE") == "true" || testing.Testing()

type Host struct {
	signalCtx                  context.Context
	stopSignalCtx              context.CancelFunc
	readinessDrainDelayCtx     context.Context
	stopReadinessDrainDelayCtx context.CancelFunc
	serverCtx                  context.Context
	stopServerCtx              context.CancelFunc
	hardShutdownCtx            context.Context
	stopHardShutdownCtx        context.CancelFunc
	isShuttingDown             atomic.Bool

	shutdownPeriod      time.Duration
	shutdownHardPeriod  time.Duration
	readinessDrainDelay time.Duration
}

// Host container to handle graceful shutdown of process
//
// Arguments:
//   - `readinessDrainDelay` = how long to wait before starting the graceful shutdown process.
//     we have an additional delay to let k8s/orchestrator machinery have some time
//     to remove this process from the active service pool
//   - `shutdownPeriod` = graceful shutdown timeout (after waiting for readiness drain)
//   - `shutdownHardPeriod` = time to wait after failing graceful shutdown period wait
//
// Usage:
//   - Construct host with arguments according to container lifecycle config
//     i.e. `terminationGracePeriodSeconds` for k8s pod spec
//   - Use `IsShuttingDown` in readiness probes
//   - Use `ServerContext` as server request contexts (e.g. `http.Server.BaseContext`)
//   - Use `WaitForShutdownSignal` and `WaitForReadinessDrain`
//     _before_ starting graceful shutdown process (e.g. `http.Server.Shutdown`)
//   - Use `ServerContext` as deadline/timeout for graceful shutdown procedure
//     e.g. “http.Server.Shutdown(host.ServerContext())`
//   - If graceful shutdown procedure fails, use `WaitForHardShutdown` to allow for some extra process
//     time before the process exits
func NewHost(
	readinessDrainDelay time.Duration,
	shutdownPeriod time.Duration,
	shutdownHardPeriod time.Duration,
) *Host {
	signalCtx, stopSignalCtx := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	readinessDrainDelayCtx, stopReadinessDrainDelayCtx := context.WithCancel(context.Background())
	serverCtx, stopServerCtx := context.WithCancel(context.Background())
	hardShutdownCtx, stopHardShutdownCtx := context.WithCancel(context.Background())

	host := &Host{
		signalCtx:                  signalCtx,
		stopSignalCtx:              stopSignalCtx,
		readinessDrainDelayCtx:     readinessDrainDelayCtx,
		stopReadinessDrainDelayCtx: stopReadinessDrainDelayCtx,
		serverCtx:                  serverCtx,
		stopServerCtx:              stopServerCtx,
		hardShutdownCtx:            hardShutdownCtx,
		stopHardShutdownCtx:        stopHardShutdownCtx,
		isShuttingDown:             atomic.Bool{},

		shutdownPeriod:      shutdownPeriod,
		shutdownHardPeriod:  shutdownHardPeriod,
		readinessDrainDelay: readinessDrainDelay,
	}
	host.isShuttingDown.Store(false)

	go host.run()

	return host
}

func (h *Host) run() {
	// We received SIGINT/SIGTERM
	// 1. Log and notify
	<-h.signalCtx.Done()
	log.Println("Shutdown signal received")
	h.stopSignalCtx()
	h.isShuttingDown.Store(true)

	// 2. Delay according drain delay period, letting k8s/orchestrator
	//    shift traffic away from this server and onto others (it takes a little time)
	//    This is to avoid request failures during rolling upgrades etc...
	time.Sleep(h.readinessDrainDelay)
	h.stopReadinessDrainDelayCtx()

	// 3. Wait for shutdown (shutdown period)
	time.Sleep(h.shutdownPeriod)
	h.stopServerCtx()

	// 4. Wait for hard shutdown (hard shutdown period)
	time.Sleep(h.shutdownHardPeriod)
	h.stopHardShutdownCtx()
}

func (h *Host) ServerContext() context.Context {
	return h.serverCtx
}

func (h *Host) IsShuttingDown() bool {
	return h.isShuttingDown.Load()
}

func (h *Host) WaitForShutdownSignal() {
	<-h.signalCtx.Done()
}

func (h *Host) WaitForReadinessDrain() {
	<-h.readinessDrainDelayCtx.Done()
}

func (h *Host) WaitForHardShutdown() {
	<-h.hardShutdownCtx.Done()
}

func (h *Host) Stop() {
	h.stopServerCtx()
}
