package cdp

// CDPMessage represents a Chrome DevTools Protocol message
// Used for both incoming events and command responses.
type CDPMessage struct {
	ID     *int64 `json:"id,omitempty"`
	Method string `json:"method,omitempty"`
	Params any    `json:"params,omitempty"`
	Result any    `json:"result,omitempty"`
	Error  any    `json:"error,omitempty"`
}

// CDPCommand represents a command to send to the browser.
type CDPCommand struct {
	ID     int64  `json:"id"`
	Method string `json:"method"`
	Params any    `json:"params,omitempty"`
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
