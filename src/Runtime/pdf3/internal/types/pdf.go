package types

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/runtime"
	"github.com/google/uuid"
)

type PdfRequest struct {
	URL                  string     `json:"url"`
	Options              PdfOptions `json:"options"`
	SetJavaScriptEnabled bool       `json:"setJavaScriptEnabled"`
	WaitFor              *WaitFor   `json:"waitFor,omitempty"`
	Cookies              []Cookie   `json:"cookies"`
}

type WaitFor struct {
	// Can be string, number, or object
	value any
}

type WaitForOptions struct {
	Selector string `json:"selector"`
	Visible  *bool  `json:"visible,omitempty"`
	Hidden   *bool  `json:"hidden,omitempty"`
	Timeout  *int32 `json:"timeout,omitempty"`
}

func (w *WaitFor) UnmarshalJSON(data []byte) error {
	// Try string first
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		w.value = s
		return nil
	}

	// Try number
	var n float64
	if err := json.Unmarshal(data, &n); err == nil {
		w.value = int32(n)
		return nil
	}

	// Try object
	var opts WaitForOptions
	if err := json.Unmarshal(data, &opts); err == nil {
		w.value = opts
		return nil
	}

	return errors.New("waitFor must be a string, number, or object")
}

func (w WaitFor) MarshalJSON() ([]byte, error) {
	return json.Marshal(w.value)
}

func (w *WaitFor) AsString() (string, bool) {
	s, ok := w.value.(string)
	return s, ok
}

func (w *WaitFor) AsTimeout() (int32, bool) {
	n, ok := w.value.(int32)
	return n, ok
}

func (w *WaitFor) AsOptions() (WaitForOptions, bool) {
	opts, ok := w.value.(WaitForOptions)
	return opts, ok
}

// NewWaitForString creates a WaitFor with a string value (event name like "load", "domcontentloaded", "networkidle")
func NewWaitForString(s string) *WaitFor {
	return &WaitFor{value: s}
}

// NewWaitForTimeout creates a WaitFor with a timeout in milliseconds
func NewWaitForTimeout(timeout int32) *WaitFor {
	return &WaitFor{value: timeout}
}

// NewWaitForOptions creates a WaitFor with selector options
func NewWaitForOptions(opts WaitForOptions) *WaitFor {
	return &WaitFor{value: opts}
}

type PdfOptions struct {
	HeaderTemplate      string    `json:"headerTemplate"`
	FooterTemplate      string    `json:"footerTemplate"`
	DisplayHeaderFooter bool      `json:"displayHeaderFooter"`
	PrintBackground     bool      `json:"printBackground"`
	Format              string    `json:"format"`
	Margin              PdfMargin `json:"margin"`
}

type PdfMargin struct {
	Top    string `json:"top"`
	Right  string `json:"right"`
	Bottom string `json:"bottom"`
	Left   string `json:"left"`
}

type Cookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain"`
	SameSite string `json:"sameSite"`
}

type PdfResult struct {
	Data    []byte
	Browser BrowserVersion
}

type BrowserVersion struct {
	Product         string
	ProtocolVersion string
	Revision        string
	UserAgent       string
	JSVersion       string
}

var (
	ErrQueueFull             = errors.New("PDF generator queue is full")
	ErrTimeout               = errors.New("PDF generation timed out during processing")
	ErrClientDropped         = errors.New("client dropped the connection")
	ErrSetCookieFail         = errors.New("setting cookie failed")
	ErrElementNotReady       = errors.New("waitFor element not ready within timeout")
	ErrGenerationFail        = errors.New("PDF generation failed")
	ErrUnhandledBrowserError = errors.New("browser operation unhandled failure")
)

type PDFError struct {
	Type error
	Msg  string
	Err  error
}

func (e *PDFError) Error() string {
	if e.Err != nil {
		if e.Msg == "" {
			return fmt.Sprintf("%s: %v", e.Type, e.Err)
		}
		return fmt.Sprintf("%s: %s: %v", e.Type, e.Msg, e.Err)
	}
	if e.Msg == "" {
		return fmt.Sprintf("%s: %v", e.Type, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Msg)
}

func (e *PDFError) Unwrap() error        { return e.Err }
func (e *PDFError) Is(target error) bool { return errors.Is(e.Type, target) }

func NewPDFError(errType error, msg string, err error) *PDFError {
	return &PDFError{Type: errType, Msg: msg, Err: err}
}

type PdfGenerator interface {
	Generate(ctx context.Context, request PdfRequest) (*PdfResult, *PDFError)
	Close() error
	IsReady() bool
}

type PdfInternalsTestInput struct {
	ID                  string        `json:"id"` // UUID to correlate with output
	CleanupDelaySeconds time.Duration `json:"cleanupDelaySeconds"`
}

// NewPdfInternalsTestInput creates a new test input with a generated UUID
func NewPdfInternalsTestInput(cleanupDelaySeconds time.Duration) *PdfInternalsTestInput {
	return &PdfInternalsTestInput{
		ID:                  uuid.New().String(),
		CleanupDelaySeconds: cleanupDelaySeconds,
	}
}

func NewDefaultPdfInternalsTestInput() *PdfInternalsTestInput {
	return &PdfInternalsTestInput{
		ID: uuid.New().String(),
	}
}

const TestInputHeaderName string = "X-Internals-Test-Input"
const TestOutputHeaderName string = "X-Internals-Test-Output"

func HasTestInternalsModeHeader(headers http.Header) bool {
	return headers.Get(TestInputHeaderName) != "" ||
		headers.Get(TestOutputHeaderName) != ""
}

func (i *PdfInternalsTestInput) Serialize(headers http.Header) {
	assert.Assert(i != nil)
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only use test input during internals test mode")
	json, err := json.Marshal(i)
	assert.AssertWithMessage(err == nil, "Should be able to serialize input")
	value := base64.StdEncoding.EncodeToString(json)
	headers.Add(TestInputHeaderName, value)
}

func (i *PdfInternalsTestInput) String() string {
	json, err := json.MarshalIndent(i, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

func (i *PdfInternalsTestInput) Deserialize(headers http.Header) {
	assert.Assert(i != nil)
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only use test input during internals test mode")
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

// NewPdfInternalsTestOutput creates a new test output with the ID from the input
func NewPdfInternalsTestOutput(input *PdfInternalsTestInput) *PdfInternalsTestOutput {
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
	if o.complete != nil {
		close(o.complete)
	}
}

// WaitForComplete waits for all snapshots to be collected, with a timeout
func (o *PdfInternalsTestOutput) WaitForComplete(timeout time.Duration) bool {
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

func (o *PdfInternalsTestOutput) Serialize(headers http.Header) {
	assert.Assert(o != nil)
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only use test output during internals test mode")
	json, err := json.Marshal(o)
	assert.AssertWithMessage(err == nil, "Should be able to serialize output")
	value := base64.StdEncoding.EncodeToString(json)
	headers.Add(TestOutputHeaderName, value)
}

func (o *PdfInternalsTestOutput) HadErrors() bool {
	for _, state := range o.BrowserStates {
		if state.ConsoleErrorLogs != 0 || state.BrowserErrors != 0 {
			return true
		}
	}
	return false
}

func (o *PdfInternalsTestOutput) String() string {
	json, err := json.MarshalIndent(o, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

func (o *PdfInternalsTestOutput) SnapshotString() string {
	copy := *o
	copy.ID = "<UUID>"
	json, err := json.MarshalIndent(copy, "", "  ")
	assert.AssertWithMessage(err == nil, "Should be able to JSON serialize")
	return string(json)
}

func (o *PdfInternalsTestOutput) Deserialize(headers http.Header) {
	assert.Assert(o != nil)
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only use test output during internals test mode")
	header := headers.Get(TestOutputHeaderName)
	assert.AssertWithMessage(header != "", "Internals test mode output header not present")
	value, err := base64.StdEncoding.DecodeString(string(header))
	assert.AssertWithMessage(err == nil, "Should be able to decode output")
	err = json.Unmarshal(value, o)
	assert.AssertWithMessage(err == nil, "Should be able to deserialize output")
}

// Global test output store for test internals mode
var testOutputStore = concurrent.NewMap[string, *PdfInternalsTestOutput]()

// StoreTestOutput stores a test output by ID (only in test internals mode)
func StoreTestOutput(output *PdfInternalsTestOutput) {
	assert.Assert(runtime.IsTestInternalsMode)
	assert.Assert(output != nil)
	assert.AssertWithMessage(output.ID != "", "Test output ID is required")
	testOutputStore.Set(output.ID, output)
}

// GetTestOutput retrieves a test output by ID (only in test internals mode)
func GetTestOutput(id string) (*PdfInternalsTestOutput, bool) {
	if !runtime.IsTestInternalsMode {
		return nil, false
	}
	assert.AssertWithMessage(id != "", "Test output ID is required")
	return testOutputStore.Get(id)
}

// UpdateTestOutput atomically updates a test output by ID (only in test internals mode)
func UpdateTestOutput(id string, fn func(*PdfInternalsTestOutput)) bool {
	if !runtime.IsTestInternalsMode {
		return false
	}
	assert.AssertWithMessage(id != "", "Test output ID is required")
	return testOutputStore.Update(id, func(ptr **PdfInternalsTestOutput) {
		fn(*ptr)
	})
}
