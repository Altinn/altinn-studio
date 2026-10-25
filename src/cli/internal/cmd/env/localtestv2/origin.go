package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// The public origin of an environment (env up --host, --port). The manifest's public section is the default; the
// state file records the origin the environment was started with, so a plain env up, env status, env down,
// studioctl run and app env use it until the next env up with other values, which is a change: down, then up.
// --port 0 picks a free port once, when the environment starts; a running environment keeps its port.
const (
	resolveTimeout = 5 * time.Second
	loopbackLine   = "127.0.0.1"
)

var (
	errOriginFlag   = errors.New("invalid public origin")
	errUnresolved   = errors.New("the public host names do not resolve to this machine")
	errNoFreePort   = errors.New("no free port")
	errNotLoopback  = errors.New("not a loopback address")
	errNoResolution = errors.New("no address")
	errPortTaken    = errors.New("the public port is taken")
)

// checkOrigin refuses a --host or --port that cannot be the public origin's, and a custom host that does not resolve
// to this machine.
func (e *Env) checkOrigin(ctx context.Context, opts UpOptions) error {
	if err := checkOriginFlags(opts); err != nil {
		return err
	}
	state, up, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return fmt.Errorf("read localtest-v2 state: %w", err)
	}
	host, _ := requestedOrigin(opts, state, up, true)
	return checkResolution(ctx, e.lookupHost, stack().Origin(host, 0))
}

// lookupHostFunc resolves a host name to its addresses; tests replace it.
type lookupHostFunc func(ctx context.Context, host string) ([]string, error)

// checkOriginFlags refuses a --host or --port that cannot be the public origin's.
func checkOriginFlags(opts UpOptions) error {
	if opts.PublicHost != "" {
		if err := manifest.CheckHost(opts.PublicHost); err != nil {
			return fmt.Errorf("%w: --host: %w", errOriginFlag, err)
		}
	}
	if opts.PublicPort != nil && *opts.PublicPort != 0 {
		if err := manifest.CheckPort(*opts.PublicPort); err != nil {
			return fmt.Errorf("%w: --port: %w", errOriginFlag, err)
		}
	}
	return nil
}

// requestedOrigin is the origin env up asks for: the flags over the recorded origin (when there is a state file) over
// the manifest's default. A --port 0 keeps the recorded port only while the front door runs on it (running); otherwise,
// as after a start whose port was taken, it is zero: pick a free one.
func requestedOrigin(
	opts UpOptions,
	state localtestv2.State,
	up bool,
	running bool,
) (host string, port int) {
	current := stack().DefaultOrigin()
	if up {
		current = state.Origin()
	}
	host, port = current.Host, current.Port
	if opts.PublicHost != "" {
		host = opts.PublicHost
	}
	if opts.PublicPort != nil {
		port = *opts.PublicPort
		if port == 0 && up && running {
			port = current.Port
		}
	}
	return host, port
}

// originChanged reports whether env up asks for another origin than the running environment's.
func originChanged(opts UpOptions, state localtestv2.State, up bool) bool {
	if !up {
		return false
	}
	host, port := requestedOrigin(opts, state, up, true)
	current := state.Origin()
	return host != current.Host || port != current.Port
}

// frontDoorRunning reports whether the front door's container runs, so a recorded port is in use by this environment.
func (e *Env) frontDoorRunning(ctx context.Context) bool {
	info, err := e.client.ContainerInspect(ctx, containerOf(frontDoor))
	return err == nil && info.State.Running
}

// portTaken reports whether starting a container failed because its published port is in use on the host: Podman's
// "address already in use", Docker's "port is already allocated".
func portTaken(err error) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "address already in use") || strings.Contains(text, "port is already allocated")
}

// freePort asks the system for a free TCP port. It asks on the loopback interface, where a port taken by another
// process on the host shows; the front door's port is then published on every interface.
func freePort(ctx context.Context) (int, error) {
	var lc net.ListenConfig
	listener, err := lc.Listen(ctx, "tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("%w: %w", errNoFreePort, err)
	}
	addr, ok := listener.Addr().(*net.TCPAddr)
	closeErr := listener.Close()
	if !ok || closeErr != nil {
		return 0, fmt.Errorf("%w: %w", errNoFreePort, closeErr)
	}
	return addr.Port, nil
}

// checkResolution refuses a custom public host whose names (the host and each of the manifest's subdomains of it) do
// not all resolve to a loopback address, with the hosts-file line that makes them: studioctl's hosts-file commands
// manage the default names only. The default host is not checked here (`env hosts add` writes it).
func checkResolution(ctx context.Context, lookup lookupHostFunc, origin manifest.Origin) error {
	if origin.Host == stack().DefaultOrigin().Host {
		return nil
	}
	var missing []string
	var reasons []string
	for _, host := range origin.Hosts() {
		if err := resolvesToLoopback(ctx, lookup, host); err != nil {
			missing = append(missing, host)
			reasons = append(reasons, host+": "+err.Error())
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return fmt.Errorf(
		"%w (%s); add this line to the hosts file (/etc/hosts):\n%s %s",
		errUnresolved, strings.Join(reasons, "; "), loopbackLine, strings.Join(missing, " "),
	)
}

func resolvesToLoopback(ctx context.Context, lookup lookupHostFunc, host string) error {
	ctx, cancel := context.WithTimeout(ctx, resolveTimeout)
	defer cancel()
	addresses, err := lookup(ctx, host)
	if err != nil {
		return errNoResolution
	}
	if len(addresses) == 0 {
		return errNoResolution
	}
	for _, address := range addresses {
		ip := net.ParseIP(address)
		if ip == nil || !ip.IsLoopback() {
			return fmt.Errorf("%w: %s", errNotLoopback, address)
		}
	}
	return nil
}
