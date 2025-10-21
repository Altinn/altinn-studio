package cdp

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/types"
	"github.com/gorilla/websocket"
)

type Command struct {
	Method string
	Params any
}

type CommandResponse struct {
	Resp *CDPResponse
	Err  error
}

// Connection represents a Chrome DevTools Protocol connection
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

// EventHandler handles CDP events
type EventHandler func(method string, params any)

// Connect establishes a connection to a Chrome DevTools Protocol endpoint
// Returns: Connection, targetID, error
func Connect(ctx context.Context, id int, debugBaseURL string, eventHandler EventHandler) (Connection, string, error) {
	// List available targets (should find the about:blank page we created)
	listURL := fmt.Sprintf("%s/json", debugBaseURL)

	var resp *http.Response
	var err error
	now := time.Now()
	for {
		resp, err = http.Get(listURL)
		if err == nil && resp.StatusCode == http.StatusOK {
			break
		}
		if time.Since(now) > 10*time.Second {
			break
		}
		// Close response body for failed attempts before retrying to prevent resource leak
		if err == nil {
			_ = resp.Body.Close()
		}
		time.Sleep(1 * time.Millisecond)
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to list targets: %w", err)
	}
	defer func() {
		// Closing HTTP response body - failure indicates connection pool leak
		if err = resp.Body.Close(); err != nil {
			log.Printf("Worker %d: Failed to close HTTP response body: %v\n", id, err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("failed to list targets: status %d", resp.StatusCode)
	}

	var targets []CDPTarget
	if err = json.NewDecoder(resp.Body).Decode(&targets); err != nil {
		return nil, "", fmt.Errorf("failed to decode targets response: %w", err)
	}

	// Chrome should always return at least one target (the page we created)
	assert.AssertWithMessage(len(targets) > 0, "Chrome returned zero targets - browser in invalid state")

	// Debug: print available targets
	log.Printf("Worker %d: Found %d targets\n", id, len(targets))
	for i, t := range targets {
		log.Printf("Worker %d: Target %d - Type: %s, ID: %s, URL: %s\n", id, i, t.Type, t.ID, t.URL)
	}

	// Find the page target (should be about:blank)
	var target *CDPTarget
	for i, t := range targets {
		if t.Type == "page" {
			target = &targets[i]
			break
		}
	}
	assert.AssertWithMessage(target != nil, "no page target found")
	targetID := target.ID

	// Connect to the page's WebSocket
	wsURL := target.WebSocketDebuggerURL
	if wsURL == "" {
		return nil, "", fmt.Errorf("no webSocketDebuggerUrl in response")
	}
	// Chrome page targets must have a WebSocket URL - this is a protocol invariant
	assert.AssertWithMessage(wsURL != "", "Page target missing WebSocketDebuggerURL - protocol violation")

	// Add debugging to understand what URL we're trying to connect to
	log.Printf("Worker %d: Attempting to connect to WebSocket URL: %s\n", id, wsURL)

	// Wait a moment to ensure the target is ready and retry connection
	var wsConn *websocket.Conn
	dialer := websocket.Dialer{
		HandshakeTimeout: 2 * time.Second,
	}
	connCtx, cancel := context.WithCancel(ctx)
	defer func() {
		if err != nil {
			cancel()
		}
	}()

	now = time.Now()
	for {
		wsConn, _, err = dialer.Dial(wsURL, nil)
		if err == nil {
			wsConn.SetCloseHandler(func(code int, text string) error {
				message := fmt.Sprintf(
					"Websocket connection closed while process is running. Code: %d, text: %s",
					code,
					text,
				)
				assert.AssertWithMessage(
					// We check ctx here as it is tied to host shutdown.
					// It's OK to close if the host is shutting down, but NOT OK otherwise
					ctx.Err() != nil,
					message,
				)
				return nil
			})
			break
		} else if time.Since(now) > 5*time.Second {
			break
		}

		time.Sleep(1 * time.Millisecond)
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to dial WebSocket: %w", err)
	}
	// Successful dial must return a valid connection
	assert.AssertWithMessage(wsConn != nil, "WebSocket dial succeeded but returned nil connection")

	// Create connection wrapper
	conn := &connection{
		id:     id,
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

func (c *connection) watchdog() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("CDP connection watchdog tick")
			const treshold int = 32
			assert.AssertWithMessage(c.cmdIDToBatchID.Len() <= treshold, "CDP connection batch datastructure overflowing")
			assert.AssertWithMessage(c.pendingBatches.Len() <= treshold, "CDP connection batch datastructure overflowing")
			assert.AssertWithMessage(c.pendingCmds.Len() <= treshold, "CDP connection cmd datastructure overflowing")
		case <-c.ctx.Done():
			log.Println("CDP connection watchdog shutting down")
			return
		}
	}
}

// GetBrowserVersion retrieves the browser version information
func GetBrowserVersion(conn Connection) (*types.BrowserVersion, error) {
	resp, err := conn.SendCommand(context.Background(), "Browser.getVersion", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get browser version: %w", err)
	}

	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid response format")
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

// connection implements the Connection interface
type connection struct {
	id     int
	wsConn *websocket.Conn

	nextCommandID  int64
	nextBatchID    int64
	pendingCmds    *concurrent.Map[int64, chan CDPResponse]
	pendingBatches *concurrent.Map[int64, *batchState]
	cmdIDToBatchID *concurrent.Map[int64, int64]

	eventHandler EventHandler

	ctx    context.Context
	cancel context.CancelFunc
}

// SendCommand sends a CDP command and waits for the response
func (c *connection) SendCommand(ctx context.Context, method string, params any) (*CDPResponse, error) {
	// Connection must be valid when sending commands
	assert.AssertWithMessage(c.wsConn != nil, "Attempted to send command on nil WebSocket connection")
	assert.AssertWithMessage(c.pendingCmds != nil, "Attempted to send command with nil pendingCmds map")

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
		return nil, fmt.Errorf("failed to send command: %w", err)
	}

	// Wait for response
	select {
	case response := <-responseCh:
		if response.Error != nil {
			return nil, fmt.Errorf("CDP error: %v", response.Error)
		}
		return &response, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-c.ctx.Done():
		return nil, fmt.Errorf("connection closed")
	case <-time.After(20 * time.Second):
		return nil, fmt.Errorf("timeout waiting for response to command %s", method)
	}
}

func (c *connection) SendCommandBatch(ctx context.Context, batch []Command) []*CommandResponse {
	// Connection must be valid when sending commands
	assert.AssertWithMessage(c.wsConn != nil, "Attempted to send command on nil WebSocket connection")
	assert.AssertWithMessage(c.pendingBatches != nil, "Attempted to send command with nil pendingCmds map")

	batchID := c.nextBatchID
	c.nextBatchID++
	state := &batchState{
		result:    make(chan struct{}),
		cmdIds:    make([]int64, len(batch)),
		responses: make([]*CommandResponse, len(batch)),
	}
	c.pendingBatches.Set(batchID, state)
	defer func() {
		state, _ := c.pendingBatches.GetAndDelete(batchID)
		if state != nil {
			for _, cmdID := range state.cmdIds {
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
		assert.AssertWithMessage(nonNilResponses == len(batch), "We should have a response for every cmd")
		return state.responses
	case <-ctx.Done():
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  ctx.Err(),
				}
			} else {
				resp.Err = ctx.Err()
			}
		}
		return state.responses
	case <-c.ctx.Done():
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  fmt.Errorf("connection closed"),
				}
			} else {
				resp.Err = fmt.Errorf("connection closed")
			}
		}
		return state.responses
	case <-time.After(20 * time.Second):
		for i, resp := range state.responses {
			if resp == nil {
				state.responses[i] = &CommandResponse{
					Resp: nil,
					Err:  fmt.Errorf("timeout waiting for response to command %s", outbox[i].Method),
				}
			} else {
				resp.Err = fmt.Errorf("timeout waiting for response to command %s", outbox[i].Method)
			}
		}
		return state.responses
	}
}

// Close closes the connection and cleans up resources
func (c *connection) Close() error {
	// Connection should always be valid when Close is called
	assert.AssertWithMessage(c.wsConn != nil, "Attempted to close connection with nil WebSocket")
	assert.AssertWithMessage(c.pendingCmds != nil, "Attempted to close connection with nil pendingCmds map")

	// Connection should only be closed after HTTP server has drained all requests.
	// If there are pending commands, it means we're closing while requests are in-flight,
	// which indicates a bug in graceful shutdown coordination.
	pendingCount := c.pendingCmds.Len()
	assert.AssertWithMessage(pendingCount == 0, fmt.Sprintf("Connection closed with %d pending commands - graceful shutdown not properly coordinated", pendingCount))

	c.cancel()

	return c.wsConn.Close()
}

// handleMessages reads messages from the WebSocket and routes them
func (c *connection) handleMessages() {
	// Connection must be fully initialized before handling messages
	assert.AssertWithMessage(c.wsConn != nil, "Message handler started with nil WebSocket connection")
	assert.AssertWithMessage(c.pendingCmds != nil, "Message handler started with nil pendingCmds map")

	// Create a channel for read results
	type readResult struct {
		payload []byte
		err     error
	}
	readCh := make(chan readResult, 1)

	// Start a goroutine to read from WebSocket
	go func() {
		for {
			_, payload, err := c.wsConn.ReadMessage()
			select {
			case <-c.ctx.Done():
				log.Printf("Worker %d: wsconn reader shutting down (context cancelled)\n", c.id)
				return
			case readCh <- readResult{payload: payload, err: err}:
				if err != nil {
					assert.AssertWithMessage(c.ctx.Err() != nil, "Got ws read error not due to shutdown")
					return
				}
			}
		}
	}()

	for {
		select {
		case <-c.ctx.Done():
			log.Printf("Worker %d: WebSocket message handler shutting down (context cancelled)\n", c.id)
			return
		case result := <-readCh:
			if result.err != nil {
				log.Printf("Worker %d: WebSocket read error: %v\n", c.id, result.err)
				return
			}

			// log.Printf("Worker %d: got CDP message: %s\n", c.id, string(result.payload))

			var msg CDPMessage
			if err := json.Unmarshal(result.payload, &msg); err != nil {
				// Chrome should never send invalid JSON - this indicates protocol corruption
				assert.AssertWithMessage(false, fmt.Sprintf("Chrome sent malformed JSON: %v (payload: %s)", err, string(result.payload)))
				continue
			}

			if msg.ID != nil {
				batchID, batchOK := c.cmdIDToBatchID.GetAndDelete(*msg.ID)
				responseCh, cmdOK := c.pendingCmds.GetAndDelete(*msg.ID)
				// If we actually can't correlate this back to the request, it is likely timed out
				assert.AssertWithMessage((batchOK || cmdOK) && batchOK != cmdOK, fmt.Sprintf("Invalid state for %d: %s", *msg.ID, msg.Method))

				if cmdOK {
					assert.AssertWithMessage(responseCh != nil, fmt.Sprintf("Response channel for command ID %d is nil", *msg.ID))
					responseCh <- CDPResponse{
						ID:     msg.ID,
						Result: msg.Result,
						Error:  msg.Error,
					}
				} else if batchOK {
					state, ok := c.pendingBatches.Get(batchID)
					assert.AssertWithMessage(ok, "Should always be able to get batch")
					index := -1
					for i, potentialCmdID := range state.cmdIds {
						if potentialCmdID == *msg.ID {
							index = i
							break
						}
					}
					assert.AssertWithMessage(index != -1, "Should always be able to find cmd in batch state")
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
