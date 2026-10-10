//nolint:ireturn // This transport package intentionally exposes protocol interfaces.
package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/types"
)

type Command struct {
	Params any
	Method string
}

type CommandResponse struct {
	Resp *CDPResponse
	Err  error
}

// Commander sends CDP commands to one target. It is safe for concurrent use.
type Commander interface {
	// SendCommand sends a CDP command and waits for the response
	SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error)

	// SendCommandBatch sends the commands in order without waiting for each response, then
	// waits for all of them. The responses are in the order of the commands.
	SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse
}

// Connection represents a Chrome DevTools Protocol connection to the browser target.
// Commands sent directly on the connection go to the browser, commands for a page go
// through the Commander returned by Session.
type Connection interface {
	Commander

	// Session returns a Commander for a target attached with Target.attachToTarget in flatten mode
	Session(sessionID string) Commander

	// Done is closed when the connection ends, including when the browser exits unexpectedly
	Done() <-chan struct{}

	// Close closes the connection and cleans up resources
	Close() error
}

// EventHandler handles CDP events. sessionID is the session of the target that sent the
// event, empty for events from the browser target.
type EventHandler func(sessionID, method string, params any)

var (
	errInvalidCDPResponseFormat = errors.New("invalid response format")
	errConnectionClosed         = errors.New("connection closed")
	errInvalidPipeEndpoints     = errors.New("CDP pipe requires reader and writer")
	errCDPCommandSend           = errors.New("failed to send cdp command")
	errCDPCommandResponse       = errors.New("cdp returned an error response")
	errCDPCommandCancelled      = errors.New("cdp command context cancelled")
	errCDPCommandTimeout        = fmt.Errorf("cdp command timeout after %s", types.RequestTimeout())
)

// responseIDPattern matches the start of a command response, Chrome writes the ID first.
var responseIDPattern = regexp.MustCompile(`^\{"id":(\d+)[,}]`)

// ConnectPipe takes ownership of the browser's --remote-debugging-pipe endpoints: read is the
// browser's output (its fd 4) and write its input (its fd 3).
func ConnectPipe(
	ctx context.Context,
	id int,
	read io.ReadCloser,
	write io.WriteCloser,
	eventHandler EventHandler,
) (Connection, error) {
	if read == nil || write == nil {
		return nil, errInvalidPipeEndpoints
	}
	return newConnection(ctx, id, newPipeTransport(read, write, types.RequestTimeout()), eventHandler), nil
}

func newConnection(ctx context.Context, id int, transport messageTransport, eventHandler EventHandler) *connection {
	connCtx, cancel := context.WithCancel(ctx)
	conn := &connection{
		id:           id,
		logger:       log.NewComponent("cdp").With("id", id),
		transport:    transport,
		pendingCmds:  concurrent.NewMap[int64, chan commandResult](),
		eventHandler: eventHandler,
		ctx:          connCtx,
		cancel:       cancel,
	}

	go conn.handleMessages()
	go conn.watchdog()
	go func() {
		// Closing the pipe unblocks the reader, whichever way the connection ended
		<-conn.ctx.Done()
		if err := conn.Close(); err != nil {
			conn.logger.Warn("Failed to close CDP transport", "error", err)
		}
	}()

	return conn
}

func (c *connection) assert(condition bool, message string) {
	assert.That(condition, message, "id", c.id)
}

func (c *connection) watchdog() {
	defer func() {
		c.assert(
			c.ctx.Err() != nil,
			"Exited CDP watchdog loop, but connection context isn't cancelled",
		)
	}()

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.logger.Info("CDP connection watchdog tick")
			const threshold int = 32
			c.assert(c.pendingCmds.Len() <= threshold, "CDP connection cmd datastructure overflowing")
		case <-c.ctx.Done():
			c.logger.Info("CDP connection watchdog shutting down")
			return
		}
	}
}

// GetBrowserVersion retrieves the browser version information.
func GetBrowserVersion(conn Connection) (*types.BrowserVersion, error) {
	resp, err := conn.SendCommand(context.Background(), "Browser.getVersion", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get browser version: %w", err)
	}

	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, errInvalidCDPResponseFormat
	}

	return &types.BrowserVersion{
		Product:         getStringFromMap(result, "product"),
		ProtocolVersion: getStringFromMap(result, "protocolVersion"),
		Revision:        getStringFromMap(result, "revision"),
		UserAgent:       getStringFromMap(result, "userAgent"),
		JSVersion:       getStringFromMap(result, "jsVersion"),
	}, nil
}

func getStringFromMap(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// commandResult is what the reader delivers for a pending command: the response, or the reason
// it couldn't be read.
type commandResult struct {
	err  error
	resp CDPResponse
}

// connection implements the Connection interface.
//
//nolint:containedctx // The connection owns a lifecycle context for its background protocol loops.
type connection struct {
	ctx           context.Context
	transport     messageTransport
	closeErr      error
	logger        *slog.Logger
	pendingCmds   *concurrent.Map[int64, chan commandResult]
	eventHandler  EventHandler
	cancel        context.CancelFunc
	nextCommandID atomic.Int64
	id            int
	closeOnce     sync.Once
}

// SendCommand sends a CDP command to the browser target and waits for the response.
func (c *connection) SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error) {
	return c.sendCommand(ctx, "", method, params)
}

// SendCommandBatch sends a batch of unrelated commands to the browser target.
func (c *connection) SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse {
	return c.sendCommandBatch(ctx, "", batch)
}

func (c *connection) Session(sessionID string) Commander {
	c.assert(sessionID != "", "Attempted to create a session commander without a session ID")
	return &session{conn: c, id: sessionID}
}

// session sends commands to a target attached to the connection in flatten mode.
type session struct {
	conn *connection
	id   string
}

func (s *session) SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error) {
	return s.conn.sendCommand(ctx, s.id, method, params)
}

func (s *session) SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse {
	return s.conn.sendCommandBatch(ctx, s.id, batch)
}

func (c *connection) sendCommand(ctx context.Context, sessionID, method string, params any) (*CDPResponse, error) {
	cmdID, responseCh, err := c.startCommand(ctx, sessionID, method, params)
	defer c.pendingCmds.GetAndDelete(cmdID)
	if err != nil {
		return nil, err
	}
	return c.awaitResponse(ctx, method, responseCh)
}

func (c *connection) sendCommandBatch(ctx context.Context, sessionID string, batch []Command) []*CommandResponse {
	responses := make([]*CommandResponse, len(batch))
	responseChs := make([]chan commandResult, len(batch))
	cmdIDs := make([]int64, 0, len(batch))
	defer func() {
		for _, cmdID := range cmdIDs {
			c.pendingCmds.GetAndDelete(cmdID)
		}
	}()
	for i, command := range batch {
		cmdID, responseCh, err := c.startCommand(ctx, sessionID, command.Method, command.Params)
		cmdIDs = append(cmdIDs, cmdID)
		if err != nil {
			responses[i] = &CommandResponse{Err: err}
			continue
		}
		responseChs[i] = responseCh
	}
	for i, command := range batch {
		if responses[i] != nil {
			continue
		}
		response, err := c.awaitResponse(ctx, command.Method, responseChs[i])
		responses[i] = &CommandResponse{Resp: response, Err: err}
	}
	return responses
}

// startCommand registers and writes a command. The caller must remove the returned ID from
// pendingCmds once it stops waiting for the response, also when startCommand fails.
func (c *connection) startCommand(
	ctx context.Context,
	sessionID, method string,
	params any,
) (int64, chan commandResult, error) {
	cmdID := c.nextCommandID.Add(1)
	if ctx.Err() != nil {
		return cmdID, nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, ctx.Err())
	}
	if c.ctx.Err() != nil {
		return cmdID, nil, errConnectionClosed
	}

	responseCh := make(chan commandResult, 1)
	c.pendingCmds.Set(cmdID, responseCh)
	cmd := CDPCommand{ID: cmdID, SessionID: sessionID, Method: method, Params: params}
	if err := c.transport.WriteJSON(ctx, cmd); err != nil {
		addCDPCommandEvent(ctx, "cdp.command.send_failed", attribute.String("cdp.method", method))
		return cmdID, nil, fmt.Errorf("%w %q: %w", errCDPCommandSend, method, err)
	}
	return cmdID, responseCh, nil
}

func (c *connection) awaitResponse(
	ctx context.Context,
	method string,
	responseCh chan commandResult,
) (*CDPResponse, error) {
	select {
	case result := <-responseCh:
		if result.err != nil {
			addCDPCommandEvent(ctx, "cdp.command.read_failed", attribute.String("cdp.method", method))
			return nil, fmt.Errorf("%w %q: %w", errCDPCommandResponse, method, result.err)
		}
		if result.resp.Error != nil {
			addCDPCommandEvent(ctx, "cdp.command.response_error", attribute.String("cdp.method", method))
			return nil, fmt.Errorf("%w %q: %v", errCDPCommandResponse, method, result.resp.Error)
		}
		return &result.resp, nil
	case <-ctx.Done():
		addCDPCommandEvent(ctx, "cdp.command.cancelled", attribute.String("cdp.method", method))
		return nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, ctx.Err())
	case <-c.ctx.Done():
		addCDPCommandEvent(ctx, "cdp.command.connection_closed", attribute.String("cdp.method", method))
		return nil, errConnectionClosed
	case <-time.After(types.RequestTimeout()):
		addCDPCommandEvent(ctx, "cdp.command.timeout",
			attribute.String("cdp.method", method),
			attribute.Int64("cdp.timeout_ms", types.RequestTimeout().Milliseconds()),
		)
		c.assert(false, "browser failed to respond to request, something must be stuck")
		return nil, fmt.Errorf("%w %q", errCDPCommandTimeout, method)
	}
}

func addCDPCommandEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	if ctx == nil {
		return
	}
	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return
	}
	span.AddEvent(name, trace.WithAttributes(attrs...))
}

// Done signals both deliberate closure and an unexpected transport failure.
func (c *connection) Done() <-chan struct{} {
	return c.ctx.Done()
}

// Close closes the connection and cleans up resources.
func (c *connection) Close() error {
	c.closeOnce.Do(func() {
		c.cancel()
		if err := c.transport.Close(); err != nil {
			c.closeErr = fmt.Errorf("close CDP transport: %w", err)
		}
	})
	return c.closeErr
}

// handleMessages reads messages from the transport and routes them. It ends the connection when
// the transport fails, a message that is too large is skipped.
func (c *connection) handleMessages() {
	defer c.cancel()
	for c.ctx.Err() == nil {
		payload, err := c.transport.ReadMessage()
		if oversized, ok := errors.AsType[*oversizedMessageError](err); ok {
			c.handleOversizedMessage(oversized)
			continue
		}
		if err != nil {
			if c.ctx.Err() == nil {
				c.logger.Error("CDP read error", "error", err)
			}
			return
		}

		var msg CDPMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			// Chrome should never send invalid JSON - this indicates protocol corruption
			assert.That(false, "Chrome sent malformed JSON", "id", c.id, "error", err)
			return
		}
		if msg.ID != nil {
			c.deliver(*msg.ID, commandResult{resp: CDPResponse{ID: msg.ID, Result: msg.Result, Error: msg.Error}})
		} else if msg.Method != "" && c.eventHandler != nil {
			c.eventHandler(msg.SessionID, msg.Method, msg.Params)
		}
	}
}

// handleOversizedMessage fails the command a skipped message responded to. A skipped event, for
// example a console message with a huge argument, is only logged.
func (c *connection) handleOversizedMessage(oversized *oversizedMessageError) {
	match := responseIDPattern.FindSubmatch(oversized.prefix)
	if match == nil {
		c.logger.Warn("Skipped CDP event that exceeds the size limit", "size", oversized.size,
			"prefix", string(oversized.prefix))
		return
	}
	cmdID, err := strconv.ParseInt(string(match[1]), 10, 64)
	if err != nil {
		c.logger.Warn("Skipped CDP response with an invalid ID", "size", oversized.size, "error", err)
		return
	}
	c.logger.Warn("Skipped CDP response that exceeds the size limit", "command_id", cmdID, "size", oversized.size)
	c.deliver(cmdID, commandResult{err: oversized})
}

func (c *connection) deliver(cmdID int64, result commandResult) {
	responseCh, ok := c.pendingCmds.GetAndDelete(cmdID)
	if !ok {
		// The caller stopped waiting, because its context was cancelled (or the command timed
		// out, which already asserted). This happens whenever a client drops a request.
		c.logger.Debug("Received response for a command nobody waits for, ignoring", "command_id", cmdID)
		return
	}
	responseCh <- result
}
