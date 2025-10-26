package types

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// Contract should be based on puppeteer
// https://github.com/browserless/browserless/blob/270aca39704908da227c9cc5b6acd50cd6ee5f9f/src/schemas.ts#L194

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

// NewWaitForString creates a WaitFor with a string value (event name like "load", "domcontentloaded", "networkidle").
func NewWaitForString(s string) *WaitFor {
	return &WaitFor{value: s}
}

// NewWaitForTimeout creates a WaitFor with a timeout in milliseconds.
func NewWaitForTimeout(timeout int32) *WaitFor {
	return &WaitFor{value: timeout}
}

// NewWaitForOptions creates a WaitFor with selector options.
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
	Domain   string `json:"domain,omitempty"`
	HttpOnly *bool  `json:"httpOnly,omitempty"`
	Name     string `json:"name"`
	Path     string `json:"path,omitempty"`
	SameSite string `json:"sameSite"`
	Secure   *bool  `json:"secure,omitempty"`
	Url      string `json:"url,omitempty"`
	Value    string `json:"value"`
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

// ValidFormats lists all valid PDF format values (must match paperFormats in browser_session.go)
// See source: https://github.com/puppeteer/puppeteer/blob/f5d922c19e61acb4205a86780967360f3531faef/packages/puppeteer-core/src/common/PDFOptions.ts#L30-L70
var ValidFormats = []string{
	"letter",
	"legal",
	"tabloid",
	"ledger",
	"a0",
	"a1",
	"a2",
	"a3",
	"a4",
	"a5",
	"a6",
}

// Validate validates the PdfRequest according to browserless schema rules.
func (r *PdfRequest) Validate() error {
	// Validate URL (required and well-formed)
	if _, err := url.ParseRequestURI(r.URL); err != nil {
		if r.URL == "" {
			return errors.New("url is required")
		}
		return fmt.Errorf("url is not well-formed: %w", err)
	}

	// Validate Options.Format (if specified, must be valid)
	if r.Options.Format != "" {
		valid := false
		for _, format := range ValidFormats {
			if strings.EqualFold(r.Options.Format, format) {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("invalid format: %s (must be one of: %v)", r.Options.Format, ValidFormats)
		}
	}

	// Validate WaitFor
	if r.WaitFor != nil {
		if str, ok := r.WaitFor.AsString(); ok {
			if str == "" {
				return errors.New("waitFor string must not be empty")
			}
		} else if timeout, timeoutOK := r.WaitFor.AsTimeout(); timeoutOK {
			if timeout < 0 {
				return errors.New("waitFor timeout must be >= 0")
			}
		} else if opts, optsOK := r.WaitFor.AsOptions(); optsOK {
			if opts.Selector == "" {
				return errors.New("waitFor selector must not be empty")
			}
			if opts.Timeout != nil && *opts.Timeout < 0 {
				return errors.New("waitFor timeout must be >= 0")
			}
			if opts.Visible != nil && opts.Hidden != nil && *opts.Visible && *opts.Hidden {
				return errors.New("waitFor options cannot have both visible and hidden set to true")
			}
		}
	}

	// Validate Cookies
	for i, cookie := range r.Cookies {
		if cookie.Name == "" {
			return fmt.Errorf("cookie[%d]: name is required", i)
		}
		if cookie.Value == "" {
			return fmt.Errorf("cookie[%d]: value is required", i)
		}
		if cookie.SameSite != "" {
			if cookie.SameSite != "Strict" && cookie.SameSite != "Lax" && cookie.SameSite != "None" {
				return fmt.Errorf(
					"cookie[%d]: sameSite must be 'Strict', 'Lax', or 'None', got '%s'",
					i,
					cookie.SameSite,
				)
			}
			if cookie.SameSite == "None" {
				if cookie.Secure == nil || !*cookie.Secure {
					return fmt.Errorf("cookie[%d]: sameSite 'None' requires secure=true", i)
				}
			}
		}
	}

	return nil
}
