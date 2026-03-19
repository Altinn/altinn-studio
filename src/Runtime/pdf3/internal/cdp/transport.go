//nolint:ireturn // This transport package intentionally exposes protocol interfaces.
package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
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

// Connection represents a Chrome DevTools Protocol connection.
type Connection interface {
	// SendCommand sends a CDP command and waits for the response
	// This method is NOT threadsafe. We use this from the processing go routine of a
	// browser session. There should only ever be 1 thread sending commands at a time.
	// The browser session owns the connection.
	SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error)

	// SendCommandBatch sends a batch of unrelated commands
	SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse

	// Close closes the connection and cleans up resources
	Close() error
}

// EventHandler handles CDP events.
type EventHandler func(method string, params any)

var (
	errMissingWebSocketDebuggerURL = errors.New("no webSocketDebuggerUrl in response")
	errInvalidCDPResponseFormat    = errors.New("invalid response format")
	errConnectionClosed            = errors.New("connection closed")
	errCDPBatchTimeout             = fmt.Errorf("cdp batch timeout after %s", types.RequestTimeout())
	errNoPageTarget                = errors.New("no page target found")
	errListTargetsStatus           = errors.New("failed to list targets with unexpected status")
	errCDPCommandSend              = errors.New("failed to send cdp command")
	errCDPCommandResponse          = errors.New("cdp returned an error response")
	errCDPCommandCancelled         = errors.New("cdp command context cancelled")
	errCDPCommandTimeout           = fmt.Errorf("cdp command timeout after %s", types.RequestTimeout())
)

// Connect establishes a connection to a Chrome DevTools Protocol endpoint.
// Returns: Connection, targetID, error.
func Connect(ctx context.Context, id int, debugBaseURL string, eventHandler EventHandler) (Connection, string, error) {
	logger := log.NewComponent("cdp").With("id", id)
	target, err := discoverPageTarget(ctx, logger, id, debugBaseURL)
	if err != nil {
		return nil, "", err
	}
	targetID := target.ID

	// Connect to the page's WebSocket
	wsURL := target.WebSocketDebuggerURL
	if wsURL == "" {
		return nil, "", errMissingWebSocketDebuggerURL
	}
	// Chrome page targets must have a WebSocket URL - this is a protocol invariant
	assert.That(wsURL != "", "Page target missing WebSocketDebuggerURL - protocol violation", "id", id)

	// Add debugging to understand what URL we're trying to connect to
	logger.Info("Attempting to connect to WebSocket", "url", wsURL)

	wsConn, err := dialTargetWebSocket(ctx, logger, id, wsURL)
	connCtx, cancel := context.WithCancel(ctx)
	if err != nil {
		cancel()
		return nil, "", fmt.Errorf("failed to dial WebSocket: %w", err)
	}
	// Successful dial must return a valid connection
	assert.That(wsConn != nil, "WebSocket dial succeeded but returned nil connection", "id", id)

	// Create connection wrapper
	conn := &connection{
		id:     id,
		logger: logger,
		wsConn: wsConn,

		nextCommandID:  1,
		nextBatchID:    1,
		pendingCmds:    concurrent.NewMap[int64, chan CDPResponse](),
		pendingBatches: concurrent.NewMap[int64, *batchState](),
		cmdIDToBatchID: concurrent.NewMap[int64, int64](),

		eventHandler: eventHandler,
		ctx:          connCtx,
		cancel:       cancel,
	}

	// Start background message handler
	go conn.handleMessages()
	go conn.watchdog()

	return conn, targetID, nil
}

func discoverPageTarget(ctx context.Context, logger *slog.Logger, id int, debugBaseURL string) (*CDPTarget, error) {
	targets, err := fetchTargets(ctx, logger, debugBaseURL)
	if err != nil {
		return nil, err
	}

	// Chrome should always return at least one target (the page we created)
	assert.That(len(targets) > 0, "Chrome returned zero targets - browser in invalid state", "id", id)

	logger.Debug("Found targets", "count", len(targets))
	for i, target := range targets {
		logger.Debug("Target info", "index", i, "target_type", target.Type, "target_id", target.ID, "url", target.URL)
	}

	for i, target := range targets {
		if target.Type == "page" {
			return &targets[i], nil
		}
	}

	assert.That(false, "no page target found", "id", id)
	return nil, errNoPageTarget
}

func fetchTargets(ctx context.Context, logger *slog.Logger, debugBaseURL string) ([]CDPTarget, error) {
	listURL := debugBaseURL + "/json"

	var resp *http.Response
	var err error
	start := time.Now()
	for {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, listURL, nil)
		if reqErr != nil {
			return nil, fmt.Errorf("create target discovery request: %w", reqErr)
		}
		resp, err = http.DefaultClient.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			break
		}
		if time.Since(start) > 10*time.Second {
			break
		}
		if err == nil {
			// Failed discovery attempts still open a response body; close it before retrying
			// or we slowly leak the node's HTTP connection pool.
			if closeErr := resp.Body.Close(); closeErr != nil {
				logger.Warn("Failed to close target discovery response body", "error", closeErr)
			}
		}
		select {
		case <-time.After(50 * time.Millisecond):
		case <-ctx.Done():
			return nil, fmt.Errorf("wait for target discovery: %w", ctx.Err())
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list targets: %w", err)
	}
	defer func() {
		// Successful discovery still holds the body open until decoding finishes.
		if closeErr := resp.Body.Close(); closeErr != nil {
			logger.Warn("Failed to close HTTP response body", "error", closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d", errListTargetsStatus, resp.StatusCode)
	}

	var targets []CDPTarget
	if err := json.NewDecoder(resp.Body).Decode(&targets); err != nil {
		return nil, fmt.Errorf("failed to decode targets response: %w", err)
	}
	return targets, nil
}

func dialTargetWebSocket(ctx context.Context, logger *slog.Logger, id int, wsURL string) (*websocket.Conn, error) {
	dialer := websocket.Dialer{HandshakeTimeout: 2 * time.Second}
	start := time.Now()

	for {
		wsConn, wsResp, err := dialer.DialContext(ctx, wsURL, nil)
		if wsResp != nil && wsResp.Body != nil {
			if closeErr := wsResp.Body.Close(); closeErr != nil {
				logger.Warn("Failed to close WebSocket upgrade response body", "error", closeErr)
			}
		}
		if err == nil {
			wsConn.SetCloseHandler(func(code int, text string) error {
				assert.That(
					// This context is tied to host shutdown. A websocket close is acceptable
					// during shutdown, but a protocol violation while the host is still live.
					ctx.Err() != nil,
					"Websocket connection closed while process is running",
					"id", id, "code", code, "text", text,
				)
				return nil
			})
			return wsConn, nil
		}
		if time.Since(start) > 5*time.Second {
			return nil, fmt.Errorf("dial websocket: %w", err)
		}

		select {
		case <-time.After(50 * time.Millisecond):
		case <-ctx.Done():
			return nil, fmt.Errorf("wait for websocket dial: %w", ctx.Err())
		}
	}
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
			const treshold int = 32
			c.assert(c.cmdIDToBatchID.Len() <= treshold, "CDP connection batch datastructure overflowing")
			c.assert(c.pendingBatches.Len() <= treshold, "CDP connection batch datastructure overflowing")
			c.assert(c.pendingCmds.Len() <= treshold, "CDP connection cmd datastructure overflowing")
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

type batchState struct {
	result    chan struct{}
	cmdIds    []int64
	responses []*CommandResponse
}

// connection implements the Connection interface.
//
//nolint:containedctx // The connection owns a lifecycle context for its background websocket loops.
type connection struct {
	ctx            context.Context
	logger         *slog.Logger
	wsConn         *websocket.Conn
	pendingCmds    *concurrent.Map[int64, chan CDPResponse]
	pendingBatches *concurrent.Map[int64, *batchState]
	cmdIDToBatchID *concurrent.Map[int64, int64]
	eventHandler   EventHandler
	cancel         context.CancelFunc
	id             int
	nextCommandID  int64
	nextBatchID    int64
}

// SendCommand sends a CDP command and waits for the response.
func (c *connection) SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error) {
	// Connection must be valid when sending commands
	c.assert(c.wsConn != nil, "Attempted to send command on nil WebSocket connection")
	c.assert(c.pendingCmds != nil, "Attempted to send command with nil pendingCmds map")

	cmdID := c.nextCommandID
	c.nextCommandID++

	cmd := CDPCommand{
		ID:     cmdID,
		Method: method,
		Params: params,
	}

	responseCh := make(chan CDPResponse, 1)
	c.pendingCmds.Set(cmdID, responseCh)
	defer c.pendingCmds.GetAndDelete(cmdID)

	// Send command
	err := c.wsConn.WriteJSON(cmd)
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

//nolint:gocognit,gocyclo,funlen // Batch routing mirrors the wire protocol state machine.
func (c *connection) SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse {
	// Connection must be valid when sending commands
	c.assert(c.wsConn != nil, "Attempted to send command on nil WebSocket connection")
	c.assert(c.pendingBatches != nil, "Attempted to send command with nil pendingCmds map")

	batchID := c.nextBatchID
	c.nextBatchID++
	state := &batchState{
		result:    make(chan struct{}),
		cmdIds:    make([]int64, len(batch)),
		responses: make([]*CommandResponse, len(batch)),
	}
	c.pendingBatches.Set(batchID, state)
	defer func() {
		batchState, _ := c.pendingBatches.GetAndDelete(batchID)
		if batchState != nil {
			for _, cmdID := range batchState.cmdIds {
				c.cmdIDToBatchID.GetAndDelete(cmdID)
			}
		}
	}()

	outbox := make([]CDPCommand, len(batch))

	for i, cmdInfo := range batch {
		cmdID := c.nextCommandID
		c.nextCommandID++
		state.cmdIds[i] = cmdID
		c.cmdIDToBatchID.Set(cmdID, batchID)

		cmd := CDPCommand{
			ID:     cmdID,
			Method: cmdInfo.Method,
			Params: cmdInfo.Params,
		}
		outbox[i] = cmd
	}

	for i, cmd := range outbox {
		err := c.wsConn.WriteJSON(cmd)
		if err != nil {
			addCDPCommandEvent(ctx, "cdp.batch.command.send_failed",
				attribute.String("cdp.method", cmd.Method),
				attribute.Int("cdp.batch.command_index", i),
			)
			state.responses[i] = &CommandResponse{
				Resp: nil,
				Err:  fmt.Errorf("failed to send command: %w", err),
			}
		}
	}

	// Wait for responses
	select {
	case <-state.result:
		nonNilResponses := 0
		for _, resp := range state.responses {
			if resp != nil {
				nonNilResponses++
			}
		}
		c.assert(nonNilResponses == len(batch), "We should have a response for every cmd")
		return state.responses
	case <-ctx.Done():
		addCDPCommandEvent(ctx, "cdp.batch.cancelled",
			attribute.Int("cdp.batch_size", len(batch)),
		)
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  fmt.Errorf("batch context cancelled: %w", ctx.Err()),
				}
			} else {
				resp.Err = fmt.Errorf("batch context cancelled: %w", ctx.Err())
			}
		}
		return state.responses
	case <-c.ctx.Done():
		addCDPCommandEvent(ctx, "cdp.batch.connection_closed",
			attribute.Int("cdp.batch_size", len(batch)),
		)
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  errConnectionClosed,
				}
			} else {
				resp.Err = errConnectionClosed
			}
		}
		return state.responses
	case <-time.After(types.RequestTimeout()):
		addCDPCommandEvent(ctx, "cdp.batch.timeout",
			attribute.Int("cdp.batch_size", len(batch)),
			attribute.Int64("cdp.timeout_ms", types.RequestTimeout().Milliseconds()),
		)
		c.assert(false, "browser failed to respond to request, something must be stuck")
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  errCDPBatchTimeout,
				}
			} else if resp.Err == nil {
				resp.Err = errCDPBatchTimeout
			}
		}
		return state.responses
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

// Close closes the connection and cleans up resources.
func (c *connection) Close() error {
	// Connection should always be valid when Close is called
	c.assert(c.wsConn != nil, "Attempted to close connection with nil WebSocket")
	c.assert(c.pendingCmds != nil, "Attempted to close connection with nil pendingCmds map")

	// Connection should only be closed after HTTP server has drained all requests.
	// If there are pending commands, it means we're closing while requests are in-flight,
	// which indicates a bug in graceful shutdown coordination.
	pendingCount := c.pendingCmds.Len()
	c.assertA(pendingCount == 0, "Connection closed with pending commands", "pendingCommands", pendingCount)

	c.cancel()

	if err := c.wsConn.Close(); err != nil {
		return fmt.Errorf("close websocket connection: %w", err)
	}
	return nil
}

// handleMessages reads messages from the WebSocket and routes them.
//
//nolint:gocognit,gocyclo,nestif,funlen // This is the protocol event loop; splitting it would hide state transitions.
func (c *connection) handleMessages() {
	defer func() {
		c.assert(c.ctx.Err() != nil, "Exited CDP message handler loop, but connection context isn't cancelled")
	}()

	// Connection must be fully initialized before handling messages
	c.assert(c.wsConn != nil, "Message handler started with nil WebSocket connection")
	c.assert(c.pendingCmds != nil, "Message handler started with nil pendingCmds map")

	// Create a channel for read results
	type readResult struct {
		err     error
		payload []byte
	}
	readCh := make(chan readResult, 1)

	// Start a goroutine to read from WebSocket
	go func() {
		defer func() {
			c.assert(c.ctx.Err() != nil, "Exited WebSocket reader loop, but connection context isn't cancelled")
		}()

		for {
			_, payload, err := c.wsConn.ReadMessage()
			select {
			case <-c.ctx.Done():
				c.logger.Info("WebSocket reader shutting down (context cancelled)")
				return
			case readCh <- readResult{payload: payload, err: err}:
				if err != nil {
					return
				}
			}
		}
	}()

	for {
		select {
		case <-c.ctx.Done():
			c.logger.Info("WebSocket message handler shutting down (context cancelled)")
			return
		case result := <-readCh:
			if result.err != nil {
				c.logger.Error("WebSocket read error", "error", result.err)
				return
			}

			// log.Printf("Worker %d: got CDP message: %s\n", c.id, string(result.payload))

			var msg CDPMessage
			if err := json.Unmarshal(result.payload, &msg); err != nil {
				// Chrome should never send invalid JSON - this indicates protocol corruption
				c.assertA(false, "Chrome sent malformed JSON", "error", err, "payload", string(result.payload))
				continue
			}

			if msg.ID != nil {
				batchID, batchOK := c.cmdIDToBatchID.GetAndDelete(*msg.ID)
				responseCh, cmdOK := c.pendingCmds.GetAndDelete(*msg.ID)

				if !batchOK && !cmdOK {
					// There are two potential reasons for this:
					// - Client dropped the outer request, and removed the pending command in the SendCommand defer block after exiting
					// - Chrome sent response after RequestTimeout
					// we can't really differentiate between this atm, so let's just log it
					c.logger.Warn(
						"Received late response for command (likely timed out) - ignoring",
						"command_id",
						*msg.ID,
					)
					continue
				}

				// Exactly one must be true - commands can't be in both states
				c.assertA(
					batchOK != cmdOK,
					"Command exists in both batch and single command state",
					"command_id",
					*msg.ID,
				)

				if cmdOK {
					c.assertA(responseCh != nil, "Response channel for command is nil", "command_id", *msg.ID)
					responseCh <- CDPResponse{
						ID:     msg.ID,
						Result: msg.Result,
						Error:  msg.Error,
					}
				} else if batchOK {
					state, ok := c.pendingBatches.Get(batchID)
					c.assertA(ok, "Should always be able to get batch", "command_id", *msg.ID)
					index := -1
					for i, potentialCmdID := range state.cmdIds {
						if potentialCmdID == *msg.ID {
							index = i
							break
						}
					}
					c.assertA(index != -1, "Should always be able to find cmd in batch state", "command_id", *msg.ID)
					state.responses[index] = &CommandResponse{
						Resp: &CDPResponse{
							ID:     msg.ID,
							Result: msg.Result,
							Error:  msg.Error,
						},
						Err: nil,
					}
					isComplete := true
					for _, resp := range state.responses {
						if resp == nil {
							isComplete = false
						}
					}
					if isComplete {
						close(state.result)
						_, _ = c.pendingBatches.GetAndDelete(batchID)
					}
				}
			} else if msg.Method != "" {
				// This is an event - call the event handler
				if c.eventHandler != nil {
					c.eventHandler(msg.Method, msg.Params)
				}
			}
		}
	}
}
