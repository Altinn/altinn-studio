package cdp

// CDPMessage represents a Chrome DevTools Protocol message
// Used for both incoming events and command responses.
type CDPMessage struct {
	Params any    `json:"params,omitempty"`
	Result any    `json:"result,omitempty"`
	Error  any    `json:"error,omitempty"`
	ID     *int64 `json:"id,omitempty"`
	Method string `json:"method,omitempty"`
}

// CDPCommand represents a command to send to the browser.
type CDPCommand struct {
	Params any    `json:"params,omitempty"`
	Method string `json:"method"`
	ID     int64  `json:"id"`
}

// CDPResponse represents a response from the browser.
type CDPResponse struct {
	ID     *int64 `json:"id,omitempty"`
	Result any    `json:"result,omitempty"`
	Error  any    `json:"error,omitempty"`
}

// CDPTarget represents a browser target (page, worker, etc.)
type CDPTarget struct {
	ID                   string `json:"id"`
	Type                 string `json:"type"`
	WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
	URL                  string `json:"url"`
}
