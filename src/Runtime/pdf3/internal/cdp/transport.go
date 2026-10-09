//nolint:ireturn // This transport package intentionally exposes protocol interfaces.
package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
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

// Commander sends CDP commands to one target.
type Commander interface {
	// SendCommand sends a CDP command and waits for the response
	// Concurrent callers are supported, including request interception handlers.
	SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error)

	// SendCommandBatch sends a batch of unrelated commands
	SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse
}

// Connection represents a Chrome DevTools Protocol connection to the browser target.
// Commands sent directly on the connection go to the browser, commands for a page go
// through the Commander returned by Session.
type Connection interface {
	Commander

	// Session returns a Commander for a target attached with Target.attachToTarget in flatten mode
	Session(sessionID string) Commander

	// Done closes when the connection ends, including an unexpected browser exit.
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

// ConnectPipe owns the browser pipe endpoints and exchanges NUL-delimited CDP JSON.
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
	return newConnection(ctx, id, newPipeTransport(read, write), eventHandler), nil
}

func newConnection(ctx context.Context, id int, transport messageTransport, eventHandler EventHandler) *connection {
	connCtx, cancel := context.WithCancel(ctx)
	// Create connection wrapper
	conn := &connection{
		id:        id,
		logger:    log.NewComponent("cdp").With("id", id),
		transport: transport,

		pendingCmds: concurrent.NewMap[int64, chan CDPResponse](),

		eventHandler: eventHandler,
		ctx:          connCtx,
		cancel:       cancel,
	}

	// Start background message handler
	go conn.handleMessages()
	go conn.watchdog()
	go func() {
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

func (c *connection) assertA(condition bool, message string, userArgs ...any) {
	args := make([]any, 0, 2+len(userArgs))
	args = append(args, "id", c.id)
	args = append(args, userArgs...)
	assert.That(condition, message, args...)
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

// connection implements the Connection interface.
//
//nolint:containedctx // The connection owns a lifecycle context for its background protocol loops.
type connection struct {
	ctx           context.Context
	transport     messageTransport
	closeErr      error
	logger        *slog.Logger
	pendingCmds   *concurrent.Map[int64, chan CDPResponse]
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
	// Connection must be valid when sending commands
	c.assert(c.transport != nil, "Attempted to send command on nil transport")
	c.assert(c.pendingCmds != nil, "Attempted to send command with nil pendingCmds map")

	if ctx.Err() != nil {
		return nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, ctx.Err())
	}
	if c.ctx.Err() != nil {
		return nil, errConnectionClosed
	}
	cmdID := c.nextCommandID.Add(1)

	cmd := CDPCommand{
		ID:        cmdID,
		SessionID: sessionID,
		Method:    method,
		Params:    params,
	}

	responseCh := make(chan CDPResponse, 1)
	c.pendingCmds.Set(cmdID, responseCh)
	defer c.pendingCmds.GetAndDelete(cmdID)

	// Bound writes as well as response waits; cleanup contexts may have no deadline.
	writeCtx, cancelWrite := context.WithTimeout(ctx, types.RequestTimeout())
	err := c.transport.WriteJSON(writeCtx, cmd)
	cancelWrite()
	if err != nil {
		addCDPCommandEvent(ctx, "cdp.command.send_failed",
			attribute.String("cdp.method", method),
		)
		return nil, fmt.Errorf("%w %q: %w", errCDPCommandSend, method, err)
	}

	// Wait for response
	select {
	case response := <-responseCh:
		if response.Error != nil {
			addCDPCommandEvent(ctx, "cdp.command.response_error",
				attribute.String("cdp.method", method),
			)
			return nil, fmt.Errorf("%w %q: %v", errCDPCommandResponse, method, response.Error)
		}
		return &response, nil
	case <-ctx.Done():
		addCDPCommandEvent(ctx, "cdp.command.cancelled",
			attribute.String("cdp.method", method),
		)
		return nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, ctx.Err())
	case <-c.ctx.Done():
		addCDPCommandEvent(ctx, "cdp.command.connection_closed",
			attribute.String("cdp.method", method),
		)
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

// sendCommandBatch sends unrelated commands concurrently and preserves their input order.
func (c *connection) sendCommandBatch(ctx context.Context, sessionID string, batch []Command) []*CommandResponse {
	responses := make([]*CommandResponse, len(batch))
	var group sync.WaitGroup
	for i, command := range batch {
		group.Go(func() {
			response, err := c.sendCommand(ctx, sessionID, command.Method, command.Params)
			responses[i] = &CommandResponse{Resp: response, Err: err}
		})
	}
	group.Wait()
	return responses
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
	// Connection should always be valid when Close is called
	c.assert(c.transport != nil, "Attempted to close connection with nil transport")
	c.assert(c.pendingCmds != nil, "Attempted to close connection with nil pendingCmds map")

	c.closeOnce.Do(func() {
		c.cancel()
		if err := c.transport.Close(); err != nil {
			c.closeErr = fmt.Errorf("close CDP transport: %w", err)
		}
	})
	return c.closeErr
}

// handleMessages reads messages from the transport and routes them.
func (c *connection) handleMessages() {
	defer c.cancel()
	for c.ctx.Err() == nil {
		payload, err := c.transport.ReadMessage()
		if err != nil {
			if c.ctx.Err() == nil {
				c.logger.Error("CDP read error", "error", err)
			}
			return
		}
		var msg CDPMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			c.assertA(false, "Chrome sent malformed JSON", "error", err)
			return
		}
		if msg.ID != nil {
			responseCh, ok := c.pendingCmds.GetAndDelete(*msg.ID)
			if !ok {
				c.logger.Warn("Received late response for command - ignoring", "command_id", *msg.ID)
				continue
			}
			responseCh <- CDPResponse{ID: msg.ID, Result: msg.Result, Error: msg.Error}
		} else if msg.Method != "" && c.eventHandler != nil {
			c.eventHandler(msg.SessionID, msg.Method, msg.Params)
		}
	}
}
