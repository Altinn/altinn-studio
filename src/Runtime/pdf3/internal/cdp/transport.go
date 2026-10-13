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

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

type Command struct {
	Params any
	Method string
}

type CommandResponse struct {
	Resp *CDPMessage
	Err  error
}

// Commander sends CDP commands to one target. It is safe for concurrent use.
type Commander interface {
	// SendCommand sends a CDP command and waits for the response
	SendCommand(ctx context.Context, method string, params any) (*CDPMessage, error)

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
	errInvalidCDPMessageFormat = errors.New("invalid response format")
	errConnectionClosed        = errors.New("connection closed")
	errInvalidPipeEndpoints    = errors.New("CDP pipe requires reader and writer")
	errCDPCommandSend          = errors.New("failed to send cdp command")
	errCDPCommandResponse      = errors.New("cdp returned an error response")
	errCDPCommandCancelled     = errors.New("cdp command context cancelled")
	errCDPCommandTimeout       = fmt.Errorf("cdp command timeout after %s", types.RequestTimeout())
)

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
		logger:       log.NewComponent("cdp").With(attr.SessionID, id),
		transport:    transport,
		pendingCmds:  concurrent.NewMap[int64, chan CDPMessage](),
		eventHandler: eventHandler,
		ctx:          connCtx,
		cancel:       cancel,
	}

	go conn.handleMessages()
	go func() {
		// Closing the pipe unblocks the reader, whichever way the connection ended
		<-conn.ctx.Done()
		if err := conn.Close(); err != nil {
			conn.logger.Warn("Failed to close CDP transport", attr.Error, err)
		}
	}()

	return conn
}

func (c *connection) assert(condition bool, message string) {
	assert.That(condition, message, attr.SessionID, c.id)
}

// GetBrowserVersion retrieves the browser version information.
func GetBrowserVersion(conn Connection) (*types.BrowserVersion, error) {
	resp, err := conn.SendCommand(context.Background(), "Browser.getVersion", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get browser version: %w", err)
	}

	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, errInvalidCDPMessageFormat
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
	pendingCmds   *concurrent.Map[int64, chan CDPMessage]
	eventHandler  EventHandler
	cancel        context.CancelFunc
	nextCommandID atomic.Int64
	id            int
	closeOnce     sync.Once
}

// SendCommand sends a CDP command to the browser target and waits for the response.
func (c *connection) SendCommand(ctx context.Context, method string, params any) (*CDPMessage, error) {
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

func (s *session) SendCommand(ctx context.Context, method string, params any) (*CDPMessage, error) {
	return s.conn.sendCommand(ctx, s.id, method, params)
}

func (s *session) SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse {
	return s.conn.sendCommandBatch(ctx, s.id, batch)
}

func (c *connection) sendCommand(ctx context.Context, sessionID, method string, params any) (*CDPMessage, error) {
	cmdID, responseCh, err := c.startCommand(ctx, sessionID, method, params)
	defer c.pendingCmds.GetAndDelete(cmdID)
	if err != nil {
		return nil, err
	}
	return c.awaitResponse(ctx, method, responseCh)
}

func (c *connection) sendCommandBatch(ctx context.Context, sessionID string, batch []Command) []*CommandResponse {
	responses := make([]*CommandResponse, len(batch))
	responseChs := make([]chan CDPMessage, len(batch))
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
) (int64, chan CDPMessage, error) {
	cmdID := c.nextCommandID.Add(1)
	if ctx.Err() != nil {
		return cmdID, nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, context.Cause(ctx))
	}
	if c.ctx.Err() != nil {
		return cmdID, nil, errConnectionClosed
	}

	responseCh := make(chan CDPMessage, 1)
	c.pendingCmds.Set(cmdID, responseCh)
	cmd := CDPCommand{ID: cmdID, SessionID: sessionID, Method: method, Params: params}
	if err := c.transport.WriteJSON(ctx, cmd); err != nil {
		return cmdID, nil, fmt.Errorf("%w %q: %w", errCDPCommandSend, method, err)
	}
	return cmdID, responseCh, nil
}

func (c *connection) awaitResponse(
	ctx context.Context,
	method string,
	responseCh chan CDPMessage,
) (*CDPMessage, error) {
	select {
	case resp := <-responseCh:
		if resp.Error != nil {
			return nil, fmt.Errorf("%w %q: %v", errCDPCommandResponse, method, resp.Error)
		}
		return &resp, nil
	case <-ctx.Done():
		return nil, fmt.Errorf("%w %q: %w", errCDPCommandCancelled, method, context.Cause(ctx))
	case <-c.ctx.Done():
		return nil, errConnectionClosed
	case <-time.After(types.RequestTimeout()):
		c.assert(false, "browser failed to respond to request, something must be stuck")
		return nil, fmt.Errorf("%w %q", errCDPCommandTimeout, method)
	}
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
// the transport fails.
func (c *connection) handleMessages() {
	defer c.cancel()
	for c.ctx.Err() == nil {
		payload, err := c.transport.ReadMessage()
		if err != nil {
			if c.ctx.Err() == nil {
				c.logger.Error("CDP read error", attr.Error, err)
			}
			return
		}

		var msg CDPMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			// Chrome should never send invalid JSON - this indicates protocol corruption
			assert.That(false, "Chrome sent malformed JSON", attr.SessionID, c.id, attr.Error, err)
			return
		}
		if msg.ID != nil {
			c.deliver(*msg.ID, msg)
		} else if msg.Method != "" && c.eventHandler != nil {
			c.eventHandler(msg.SessionID, msg.Method, msg.Params)
		}
	}
}

func (c *connection) deliver(cmdID int64, resp CDPMessage) {
	responseCh, ok := c.pendingCmds.GetAndDelete(cmdID)
	if !ok {
		// The caller stopped waiting, because its context was cancelled (or the command timed
		// out, which already asserted). This happens whenever a client drops a request.
		c.logger.Debug("Received response for a command nobody waits for, ignoring", attr.CDPCommandID, cmdID)
		return
	}
	responseCh <- resp
}
