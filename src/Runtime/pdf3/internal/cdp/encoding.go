package cdp

// CDPMessage is a message from the browser: a response to a command (ID set) or an event
// (Method set).
type CDPMessage struct {
	Params    any    `json:"params,omitempty"`
	Result    any    `json:"result,omitempty"`
	Error     any    `json:"error,omitempty"`
	ID        *int64 `json:"id,omitempty"`
	Method    string `json:"method,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
}

// CDPCommand represents a command to send to the browser.
// SessionID routes the command to an attached target, empty means the browser target.
type CDPCommand struct {
	Params    any    `json:"params,omitempty"`
	Method    string `json:"method"`
	SessionID string `json:"sessionId,omitempty"`
	ID        int64  `json:"id"`
}
