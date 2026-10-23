package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/ui"
)

// Health. Only the front door's port is published, so a container's health endpoint cannot be polled from the host.
// Nor can the container runtime's own health check run it: that executes in the container, and Storage's and Receipt's
// chiseled images have no shell. So each container's check runs in a short-lived probe container on the stack's
// network, created through the container client like any other container, and the runtime waits for it to exit: 0 is
// healthy. The probe image is the manifest's Postgres image, which the default group always pulls and whose bash does
// the checks over /dev/tcp. A check gates what depends on the container (devenv's ReadinessProbe), so Postgres accepts
// connections before the components that migrate at start begin, and Dialogporten's WebApi has migrated before its
// other hosts start. Once every container is up, the front door's own /health is polled through the published port.
const (
	healthTimeout      = 3 * time.Minute
	healthPollInterval = time.Second
	healthRequestLimit = 5 * time.Second
	probePollInterval  = 500 * time.Millisecond
	probeRemoveTimeout = 30 * time.Second
	// probeAttempts is how many times a probe tries, a second apart, before it gives up: healthTimeout's worth.
	probeAttempts = int(healthTimeout / time.Second)
	// probeReadTimeout is how long a probe waits for the status line once connected, in seconds.
	probeReadTimeout = 5
	// probeImageContainer is the manifest container whose image the probes run in.
	probeImageContainer = "postgres"
	probeStatusExited   = "exited"
	probeStatusDead     = "dead"
	probeStatusStopped  = "stopped"
)

var (
	errUnhealthy    = errors.New("not healthy")
	errProbeTimeout = errors.New("probe did not finish")
)

// healthTarget is one container's health check: an HTTP GET of path that answers 200, or a TCP connection.
type healthTarget struct {
	name string
	path string
	port int
	tcp  bool
}

func healthTargetOf(name string) healthTarget {
	c := stack().Containers[name]
	return healthTarget{name: name, path: c.HealthCheck(), port: c.HTTPPort(), tcp: !c.IsHTTP()}
}

// String describes the check: "tcp postgres:5432" or "http://storage:5010/health".
func (t healthTarget) String() string {
	if t.tcp {
		return "tcp " + t.name + ":" + strconv.Itoa(t.port)
	}
	return "http://" + t.name + ":" + strconv.Itoa(t.port) + t.path
}

// probeScript is the bash a probe runs: up to attempts tries a second apart, exit 0 at the first success. The HTTP
// check reads the status line only; the request is HTTP/1.0, so the server closes the connection.
func probeScript(t healthTarget, attempts int) string {
	connect := "{ exec 3<>/dev/tcp/" + t.name + "/" + strconv.Itoa(t.port) + "; } 2>/dev/null"
	check := "if " + connect + "; then exec 3<&-; exit 0; fi"
	if !t.tcp {
		check = "if " + connect + "; then " +
			"printf 'GET " + t.path + " HTTP/1.0\\r\\nHost: " + t.name + "\\r\\n\\r\\n' >&3; " +
			"IFS= read -r -t " + strconv.Itoa(probeReadTimeout) + " line <&3 || line=; exec 3<&-; " +
			"case \"$line\" in *' 200 '*) exit 0;; esac; fi"
	}
	return "for i in $(seq 1 " + strconv.Itoa(attempts) + "); do " + check + "; sleep 1; done; exit 1"
}

// prober runs the probe containers.
type prober struct {
	client  container.ContainerClient
	pullErr error
	// verbosef logs how long each container took to answer its check (`studioctl --verbose`).
	verbosef func(format string, args ...any)
	image    string
	pull     sync.Once
}

func newProber(client container.ContainerClient, verbosef func(format string, args ...any)) *prober {
	return &prober{
		client:   client,
		pullErr:  nil,
		verbosef: verbosef,
		image:    stack().Containers[probeImageContainer].Image(),
		pull:     sync.Once{},
	}
}

// probes is the readinessProbes of the runtime.
func (p *prober) probes(target healthTarget) func(ctx context.Context) error {
	return func(ctx context.Context) error {
		return p.run(ctx, target)
	}
}

// ensureImage pulls the probe image once when it is not on this machine yet; a probe can run before the Postgres
// container's own image resource has been pulled, since containers that do not depend on Postgres start alongside it.
func (p *prober) ensureImage(ctx context.Context) error {
	p.pull.Do(func() {
		if _, err := p.client.ImageInspect(ctx, p.image); err == nil {
			return
		}
		if err := p.client.ImagePull(ctx, p.image); err != nil {
			p.pullErr = fmt.Errorf("pull probe image %s: %w", p.image, err)
		}
	})
	return p.pullErr
}

func (p *prober) run(ctx context.Context, target healthTarget) error {
	if err := p.ensureImage(ctx); err != nil {
		return err
	}
	name := containerPrefix + "probe-" + target.name
	p.remove(ctx, name)
	if _, err := p.client.CreateContainer(ctx, types.ContainerConfig{
		Labels:         nil,
		HealthCheck:    nil,
		Name:           name,
		Image:          p.image,
		User:           "",
		UsernsMode:     "",
		RestartPolicy:  "",
		ExtraHosts:     nil,
		NetworkAliases: nil,
		Volumes:        nil,
		Networks:       []string{networkName},
		Ports:          nil,
		Env:            nil,
		Command:        []string{"bash", "-c", probeScript(target, probeAttempts)},
		CapAdd:         nil,
		Detach:         true,
	}); err != nil {
		return fmt.Errorf("start health probe for %s: %w", target, err)
	}
	defer p.remove(ctx, name)
	started := time.Now()

	waitCtx, cancel := context.WithTimeout(ctx, healthTimeout+time.Minute)
	defer cancel()
	for {
		state, err := p.client.ContainerState(waitCtx, name)
		if err != nil {
			return fmt.Errorf("health probe for %s: %w", target, err)
		}
		if !state.Running && probeFinished(state.Status) {
			if state.ExitCode != 0 {
				return fmt.Errorf("%w after %s: %s", errUnhealthy, healthTimeout, target)
			}
			p.verbosef("%s healthy after %s (%s)", target.name, time.Since(started).Round(time.Millisecond), target)
			return nil
		}
		select {
		case <-waitCtx.Done():
			return fmt.Errorf("%w: %s: %w", errProbeTimeout, target, waitCtx.Err())
		case <-time.After(probePollInterval):
		}
	}
}

func probeFinished(status string) bool {
	switch strings.ToLower(status) {
	case probeStatusExited, probeStatusDead, probeStatusStopped:
		return true
	}
	return false
}

// remove deletes a probe container, which may not exist; also when the apply was cancelled.
func (p *prober) remove(ctx context.Context, name string) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), probeRemoveTimeout)
	defer cancel()
	ignoreError(p.client.ContainerRemove(ctx, name, true))
}

// waitFrontDoor polls the front door's health through the published port until it answers 200, or the timeout passes.
func waitFrontDoor(ctx context.Context, out *ui.Output, url string) error {
	ctx, cancel := context.WithTimeout(ctx, healthTimeout)
	defer cancel()
	client := &http.Client{Timeout: healthRequestLimit}
	for {
		err := probeURL(ctx, client, url)
		if err == nil {
			out.Verbosef("front door healthy at %s", url)
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("%w after %s: %s: %w", errUnhealthy, healthTimeout, url, err)
		case <-time.After(healthPollInterval):
		}
	}
}

func probeURL(ctx context.Context, client *http.Client, url string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request: %w", err)
	}
	defer closeBody(resp)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: HTTP %d", errUnhealthy, resp.StatusCode)
	}
	return nil
}

func closeBody(resp *http.Response) {
	ignoreError(resp.Body.Close())
}

func ignoreError(error) {}

// frontDoorHealthURL is the front door's own health endpoint on the public origin.
func frontDoorHealthURL(opts *Options) string {
	return strings.TrimRight(opts.Topology.LocaltestURL(), "/") + stack().Containers[frontDoor].HealthCheck()
}
