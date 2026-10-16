package telemetry

import (
	"context"
	"net/url"
	"strings"
	"sync"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

type requestAttributesKey struct{}

// RequestAttributes collects attributes from wherever a request is handled, for its entry span.
type RequestAttributes struct {
	index map[attribute.Key]int
	attrs []attribute.KeyValue
	mu    sync.Mutex
}

func NewRequestAttributes() *RequestAttributes {
	return &RequestAttributes{
		attrs: make([]attribute.KeyValue, 0, 64),
		index: make(map[attribute.Key]int, 64),
	}
}

func WithRequestAttributes(ctx context.Context, data *RequestAttributes) context.Context {
	if data == nil {
		return ctx
	}
	return context.WithValue(ctx, requestAttributesKey{}, data)
}

func RequestAttributesFromContext(ctx context.Context) *RequestAttributes {
	if ctx == nil {
		return nil
	}
	if data, ok := ctx.Value(requestAttributesKey{}).(*RequestAttributes); ok {
		return data
	}
	return nil
}

func (d *RequestAttributes) SetPdfRequest(req types.PdfRequest) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setURLLocked(req.URL)
	d.setWaitForLocked(req.WaitFor)

	d.setKVLocked(attribute.Int(attr.RequestCookiesCount, len(req.Cookies)))
	if len(req.Cookies) > 0 {
		names := make([]string, 0, len(req.Cookies))
		lengths := make([]int64, 0, len(req.Cookies))
		for _, cookie := range req.Cookies {
			names = append(names, cookie.Name)
			lengths = append(lengths, int64(len(cookie.Value)))
		}
		d.setKVLocked(attribute.StringSlice(attr.RequestCookiesNames, names))
		d.setKVLocked(attribute.Int64Slice(attr.RequestCookiesValueLengths, lengths))
	}

	d.setKVLocked(attribute.Bool(attr.RequestSetJavaScriptEnabled, req.SetJavaScriptEnabled))

	if req.Options.Format != "" {
		d.setKVLocked(attribute.String(attr.RequestOptionsFormat, req.Options.Format))
	}
	if req.Options.PrintBackground {
		d.setKVLocked(attribute.Bool(attr.RequestOptionsPrintBackground, true))
	}
	if req.Options.DisplayHeaderFooter {
		d.setKVLocked(attribute.Bool(attr.RequestOptionsDisplayHeaderFooter, true))
	}
	if req.Options.HeaderTemplate != "" {
		d.setKVLocked(attribute.Int(attr.RequestOptionsHeaderTemplateLen, len(req.Options.HeaderTemplate)))
	}
	if req.Options.FooterTemplate != "" {
		d.setKVLocked(attribute.Int(attr.RequestOptionsFooterTemplateLen, len(req.Options.FooterTemplate)))
	}
	if req.Options.Margin.Top != "" {
		d.setKVLocked(attribute.String(attr.RequestOptionsMarginTop, req.Options.Margin.Top))
	}
	if req.Options.Margin.Right != "" {
		d.setKVLocked(attribute.String(attr.RequestOptionsMarginRight, req.Options.Margin.Right))
	}
	if req.Options.Margin.Bottom != "" {
		d.setKVLocked(attribute.String(attr.RequestOptionsMarginBottom, req.Options.Margin.Bottom))
	}
	if req.Options.Margin.Left != "" {
		d.setKVLocked(attribute.String(attr.RequestOptionsMarginLeft, req.Options.Margin.Left))
	}
}

// SetServiceOwner records the service owner the request is for. It records nothing for "", an
// unknown service owner.
func (d *RequestAttributes) SetServiceOwner(serviceOwner string) {
	if d == nil || serviceOwner == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.String(attr.ServiceOwner, serviceOwner))
}

// SetApp records the app whose page the request renders. It records nothing for "", an unknown
// app.
func (d *RequestAttributes) SetApp(app string) {
	if d == nil || app == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.String(attr.App, app))
}

func (d *RequestAttributes) SetQueueStats(depth, capacity int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int(attr.QueueDepth, depth))
	d.setKVLocked(attribute.Int(attr.QueueCapacity, capacity))
}

func (d *RequestAttributes) SetSessionID(id int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int(attr.SessionID, id))
}

func (d *RequestAttributes) SetConsoleErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int(attr.PageConsoleErrors, count))
}

func (d *RequestAttributes) SetBrowserErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int(attr.PageBrowserErrors, count))
}

func (d *RequestAttributes) SetJSExceptions(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int(attr.PageJSExceptions, count))
}

func (d *RequestAttributes) SetRejection(reason string) {
	if d == nil || reason == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVIfAbsentLocked(attribute.String(attr.ResponseRejectionReason, reason))
}

// SetPDFAConversion records whether and how the PDF was converted to PDF/A.
func (d *RequestAttributes) SetPDFAConversion(enabled bool, status string, inputSize, outputSize int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Bool(attr.ConvertToPDFAEnabled, enabled))
	d.setKVLocked(attribute.Bool(attr.ConvertToPDFAApplied, status == "success"))
	d.setKVLocked(attribute.String(attr.ConvertToPDFAStatus, status))
	d.setKVLocked(attribute.Int(attr.ConvertToPDFAInputSizeBytes, inputSize))
	if outputSize > 0 {
		d.setKVLocked(attribute.Int(attr.ConvertToPDFAOutputSizeBytes, outputSize))
	}
}

// SetOnSpan puts the request's attributes on span, the request's entry span: the one wide event
// for the request.
func SetOnSpan(span trace.Span, data *RequestAttributes) {
	if data == nil || !span.IsRecording() {
		return
	}

	data.mu.Lock()
	defer data.mu.Unlock()
	span.SetAttributes(data.attrs...)
}

func (d *RequestAttributes) setKVLocked(kv attribute.KeyValue) {
	if idx, ok := d.index[kv.Key]; ok {
		d.attrs[idx] = kv
		return
	}
	d.index[kv.Key] = len(d.attrs)
	d.attrs = append(d.attrs, kv)
}

func (d *RequestAttributes) setKVIfAbsentLocked(kv attribute.KeyValue) {
	if _, ok := d.index[kv.Key]; ok {
		return
	}
	d.index[kv.Key] = len(d.attrs)
	d.attrs = append(d.attrs, kv)
}

func (d *RequestAttributes) setURLLocked(raw string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		d.setKVLocked(attribute.Bool(attr.RequestURLInvalid, true))
		return
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		d.setKVLocked(attribute.Bool(attr.RequestURLInvalid, true))
		return
	}

	path := u.EscapedPath()
	if path == "" {
		path = "/"
	}
	d.setKVLocked(attribute.String(attr.RequestURLScheme, u.Scheme))
	d.setKVLocked(attribute.String(attr.RequestURLHost, u.Host))
	d.setKVLocked(attribute.String(attr.RequestURLPath, path))
}

func (d *RequestAttributes) setWaitForLocked(waitFor *types.WaitFor) {
	if waitFor == nil {
		d.setKVLocked(attribute.String(attr.RequestWaitForType, "load_event"))
		return
	}
	if _, ok := waitFor.AsString(); ok {
		d.setKVLocked(attribute.String(attr.RequestWaitForType, "selector"))
		d.setKVLocked(attribute.Bool(attr.RequestWaitForSelectorPresent, true))
		return
	}
	if timeout, ok := waitFor.AsTimeout(); ok {
		d.setKVLocked(attribute.String(attr.RequestWaitForType, "timeout"))
		d.setKVLocked(attribute.Int64(attr.RequestWaitForTimeoutMs, int64(timeout)))
		return
	}
	if opts, ok := waitFor.AsOptions(); ok {
		d.setKVLocked(attribute.String(attr.RequestWaitForType, "options"))
		d.setKVLocked(attribute.Bool(attr.RequestWaitForSelectorPresent, opts.Selector != ""))
		if opts.Timeout != nil {
			d.setKVLocked(attribute.Int64(attr.RequestWaitForTimeoutMs, int64(*opts.Timeout)))
		}
		if opts.Visible != nil {
			d.setKVLocked(attribute.Bool(attr.RequestWaitForVisible, *opts.Visible))
		}
		if opts.Hidden != nil {
			d.setKVLocked(attribute.Bool(attr.RequestWaitForHidden, *opts.Hidden))
		}
		return
	}

	d.setKVLocked(attribute.String(attr.RequestWaitForType, "unknown"))
}
