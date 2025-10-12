package cdp

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// CDP message types
type CDPMessage struct {
	ID     *int64      `json:"id,omitempty"`
	Method string      `json:"method,omitempty"`
	Params interface{} `json:"params,omitempty"`
	Result interface{} `json:"result,omitempty"`
	Error  interface{} `json:"error,omitempty"`
}

type CDPCommand struct {
	ID     int64       `json:"id"`
	Method string      `json:"method"`
	Params interface{} `json:"params,omitempty"`
}

type CDPResponse struct {
	ID     *int64      `json:"id,omitempty"`
	Result interface{} `json:"result,omitempty"`
	Error  interface{} `json:"error,omitempty"`
}

type CDPTarget struct {
	ID                   string `json:"id"`
	Type                 string `json:"type"`
	WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
	URL                  string `json:"url"`
}

// getStringFromMap safely extracts a string value from a map
func GetStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// ConnectToPageTarget establishes a connection to a Chrome DevTools Protocol page target
func ConnectToPageTarget(id int, debugBaseURL string) (string, *websocket.Conn, error) {
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
		return "", nil, fmt.Errorf("failed to list targets: %w", err)
	}
	defer func() {
		// Closing HTTP response body - failure indicates connection pool leak
		if err := resp.Body.Close(); err != nil {
			log.Printf("Worker %d: Failed to close HTTP response body: %v\n", id, err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("failed to list targets: status %d", resp.StatusCode)
	}

	var targets []CDPTarget
	if err := json.NewDecoder(resp.Body).Decode(&targets); err != nil {
		return "", nil, fmt.Errorf("failed to decode targets response: %w", err)
	}

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

	if target == nil {
		return "", nil, fmt.Errorf("no page target found - browser may not have started correctly")
	}

	targetID := target.ID

	// Connect to the page's WebSocket
	wsURL := target.WebSocketDebuggerURL
	if wsURL == "" {
		return "", nil, fmt.Errorf("no webSocketDebuggerUrl in response")
	}

	// Add debugging to understand what URL we're trying to connect to
	log.Printf("Worker %d: Attempting to connect to WebSocket URL: %s\n", id, wsURL)

	// Wait a moment to ensure the target is ready and retry connection
	var conn *websocket.Conn
	dialer := websocket.Dialer{
		HandshakeTimeout: 2 * time.Second,
	}

	now = time.Now()
	for {
		conn, _, err = dialer.Dial(wsURL, nil)
		if err == nil || time.Since(now) > 5*time.Second {
			break
		}

		time.Sleep(1 * time.Millisecond)
	}

	if err != nil {
		return "", nil, fmt.Errorf("failed to dial WebSocket: %w", err)
	}

	return targetID, conn, nil
}
