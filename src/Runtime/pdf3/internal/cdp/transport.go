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

// Connection represents a Chrome DevTools Protocol connection
type Connection interface {
	// SendCommand sends a CDP command and waits for the response
	SendCommand(ctx context.Context, method string, params interface{}) (*CDPResponse, error)

	// Close closes the connection and cleans up resources
	Close() error
}

// EventHandler handles CDP events
type EventHandler func(method string, params interface{})

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
		id:            id,
		wsConn:        wsConn,
		nextCommandID: 1,
		pendingCmds:   concurrent.NewMap[int64, chan CDPResponse](),
		eventHandler:  eventHandler,
		ctx:           connCtx,
		cancel:        cancel,
	}

	// Start background message handler
	go conn.handleMessages()

	return conn, targetID, nil
}

// GetBrowserVersion retrieves the browser version information
func GetBrowserVersion(conn Connection) (*types.BrowserVersion, error) {
	resp, err := conn.SendCommand(context.Background(), "Browser.getVersion", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get browser version: %w", err)
	}

	result, ok := resp.Result.(map[string]interface{})
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

func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// connection implements the Connection interface
type connection struct {
	id            int
	wsConn        *websocket.Conn
	nextCommandID int64
	pendingCmds   *concurrent.Map[int64, chan CDPResponse]
	eventHandler  EventHandler

	ctx    context.Context
	cancel context.CancelFunc
}

// SendCommand sends a CDP command and waits for the response
func (c *connection) SendCommand(ctx context.Context, method string, params interface{}) (*CDPResponse, error) {
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

	// Send command
	err := c.wsConn.WriteJSON(cmd)
	if err != nil {
		c.pendingCmds.GetAndDelete(cmdID)
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
		c.pendingCmds.GetAndDelete(cmdID)
		return nil, ctx.Err()
	case <-c.ctx.Done():
		c.pendingCmds.GetAndDelete(cmdID)
		return nil, fmt.Errorf("connection closed")
	case <-time.After(30 * time.Second):
		c.pendingCmds.GetAndDelete(cmdID)
		return nil, fmt.Errorf("timeout waiting for response to command %s", method)
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
				// This is a response to a command
				responseCh, ok := c.pendingCmds.GetAndDelete(*msg.ID)
				// Chrome sent a response for a command we never sent or already handled
				// This indicates either protocol corruption or a bug in our command tracking
				assert.AssertWithMessage(ok, fmt.Sprintf("Received response for unknown command ID %d", *msg.ID))
				assert.AssertWithMessage(responseCh != nil, fmt.Sprintf("Response channel for command ID %d is nil", *msg.ID))

				responseCh <- CDPResponse{
					ID:     msg.ID,
					Result: msg.Result,
					Error:  msg.Error,
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
