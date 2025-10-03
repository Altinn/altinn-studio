package types

import (
	"context"
	"errors"
	"fmt"
)

const MaxConcurrency = 4

type PdfRequest struct {
	URL                  string     `json:"url"`
	Options              PdfOptions `json:"options"`
	SetJavaScriptEnabled bool       `json:"setJavaScriptEnabled"`
	WaitFor              string     `json:"waitFor"`
	Cookies              []Cookie   `json:"cookies"`
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

type PdfResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
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
}
