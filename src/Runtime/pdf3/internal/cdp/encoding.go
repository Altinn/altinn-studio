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
// SessionID routes the command to an attached target, empty means the browser target.
type CDPCommand struct {
	Params    any    `json:"params,omitempty"`
	Method    string `json:"method"`
	SessionID string `json:"sessionId,omitempty"`
	ID        int64  `json:"id"`
}

// CDPResponse represents a response from the browser.
type CDPResponse struct {
	ID     *int64 `json:"id,omitempty"`
	Result any    `json:"result,omitempty"`
	Error  any    `json:"error,omitempty"`
}

// CDPVersion is the response of the /json/version discovery endpoint.
type CDPVersion struct {
	WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
}
