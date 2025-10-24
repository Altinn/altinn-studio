package testing

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/runtime"
	"github.com/google/uuid"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const testInputContextKey contextKey = "test-input"

type PdfInternalsTestInput struct {
	ID                  string `json:"id"` // UUID to correlate with output
	CleanupDelaySeconds int    `json:"cleanupDelaySeconds"`
}

// NewTestInput creates a new test input with a generated UUID
func NewTestInput(cleanupDelaySeconds int) *PdfInternalsTestInput {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	return &PdfInternalsTestInput{
		ID:                  uuid.New().String(),
		CleanupDelaySeconds: cleanupDelaySeconds,
	}
}

func NewTestInputFrom(other *PdfInternalsTestInput) *PdfInternalsTestInput {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	return &PdfInternalsTestInput{
		ID:                  uuid.New().String(),
		CleanupDelaySeconds: other.CleanupDelaySeconds,
	}
}

func NewDefaultTestInput() *PdfInternalsTestInput {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	return &PdfInternalsTestInput{
		ID: uuid.NewString(),
	}
}

const TestInputHeaderName string = "X-Internals-Test-Input"

// TestInputContextKey returns the context key for storing test input
func TestInputContextKey() contextKey {
	return testInputContextKey
}

func HasTestHeader(headers http.Header) bool {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	return headers.Get(TestInputHeaderName) != ""
}

func (i *PdfInternalsTestInput) Serialize(headers http.Header) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	json, err := json.Marshal(i)
	assert.AssertWithMessage(err == nil, "Should be able to serialize input")
	value := base64.StdEncoding.EncodeToString(json)
	headers.Add(TestInputHeaderName, value)
}

func (i *PdfInternalsTestInput) String() string {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	json, err := json.MarshalIndent(i, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

func (i *PdfInternalsTestInput) Deserialize(headers http.Header) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	assert.Assert(i != nil)
	header := headers.Get(TestInputHeaderName)
	if header != "" {
		value, err := base64.StdEncoding.DecodeString(string(header))
		assert.AssertWithMessage(err == nil, "Should be able to decode input")
		err = json.Unmarshal(value, i)
		assert.AssertWithMessage(err == nil, "Should be able to deserialize input")
		assert.AssertWithMessage(i.ID != "", "Test input ID is required")
	}
}

func CopyTestInput(dst http.Header, src http.Header) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	header := src.Get(TestInputHeaderName)
	if header != "" {
		dst.Set(TestInputHeaderName, header)
	}
}

type BrowserState struct {
	State            string   `json:"state"`            // Session state when snapshot was taken (e.g., "Generating", "CleaningUp")
	Cookies          []string `json:"cookies"`          // List of cookie names present in browser
	ConsoleErrorLogs int      `json:"consoleErrorLogs"` // Count of console errors at this point
	BrowserErrors    int      `json:"browserErrors"`    // Count of browser errors at this point
}

type PdfInternalsTestOutput struct {
	ID            string         `json:"id"`            // UUID from input to correlate
	BrowserStates []BrowserState `json:"browserStates"` // Snapshots at different state transitions
	complete      chan struct{}  `json:"-"`             // Closed when all snapshots are collected
}

// NewTestOutput creates a new test output with the ID from the input
func NewTestOutput(input *PdfInternalsTestInput) *PdfInternalsTestOutput {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	assert.Assert(input != nil)
	assert.AssertWithMessage(input.ID != "", "Test input ID is required")
	return &PdfInternalsTestOutput{
		ID:            input.ID,
		BrowserStates: make([]BrowserState, 0),
		complete:      make(chan struct{}),
	}
}

// MarkComplete signals that all browser state snapshots have been collected
func (o *PdfInternalsTestOutput) MarkComplete() {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	if o.complete != nil {
		close(o.complete)
	}
}

// WaitForComplete waits for all snapshots to be collected, with a timeout
func (o *PdfInternalsTestOutput) WaitForComplete(timeout time.Duration) bool {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	if o.complete == nil {
		return true // Already complete or no channel
	}
	select {
	case <-o.complete:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (o *PdfInternalsTestOutput) HadErrors() bool {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	for _, state := range o.BrowserStates {
		if state.ConsoleErrorLogs != 0 || state.BrowserErrors != 0 {
			return true
		}
	}
	return false
}

func (o *PdfInternalsTestOutput) String() string {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	json, err := json.MarshalIndent(o, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

func (o *PdfInternalsTestOutput) SnapshotString() string {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	copy := *o
	copy.ID = "UUID"
	json, err := json.MarshalIndent(copy, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

// Global test output store for test internals mode
var testOutputStore = concurrent.NewMap[string, *PdfInternalsTestOutput]()

// StoreTestOutput stores a test output by ID (only in test internals mode)
func StoreTestOutput(output *PdfInternalsTestOutput) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	assert.Assert(output != nil)
	assert.AssertWithMessage(output.ID != "", "Test output ID is required")
	testOutputStore.Set(output.ID, output)
}

// GetTestOutput retrieves a test output by ID (only in test internals mode)
func GetTestOutput(id string) (*PdfInternalsTestOutput, bool) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	assert.AssertWithMessage(id != "", "Test output ID is required")
	return testOutputStore.Get(id)
}

// UpdateTestOutput atomically updates a test output by ID (only in test internals mode)
func UpdateTestOutput(id string, fn func(*PdfInternalsTestOutput)) bool {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
	assert.AssertWithMessage(id != "", "Test output ID is required")
	return testOutputStore.Update(id, func(ptr **PdfInternalsTestOutput) {
		fn(*ptr)
	})
}
