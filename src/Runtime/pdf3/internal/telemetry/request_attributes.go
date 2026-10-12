package telemetry

import (
	"context"
	"net/url"
	"strings"
	"sync"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

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

	d.setKVLocked(attribute.Int("pdf.request.cookies.count", len(req.Cookies)))
	if len(req.Cookies) > 0 {
		names := make([]string, 0, len(req.Cookies))
		lengths := make([]int64, 0, len(req.Cookies))
		for _, cookie := range req.Cookies {
			names = append(names, cookie.Name)
			lengths = append(lengths, int64(len(cookie.Value)))
		}
		d.setKVLocked(attribute.StringSlice("pdf.request.cookies.names", names))
		d.setKVLocked(attribute.Int64Slice("pdf.request.cookies.value_lengths", lengths))
	}

	d.setKVLocked(attribute.Bool("pdf.request.set_javascript_enabled", req.SetJavaScriptEnabled))

	if req.Options.Format != "" {
		d.setKVLocked(attribute.String("pdf.request.options.format", req.Options.Format))
	}
	if req.Options.PrintBackground {
		d.setKVLocked(attribute.Bool("pdf.request.options.print_background", true))
	}
	if req.Options.DisplayHeaderFooter {
		d.setKVLocked(attribute.Bool("pdf.request.options.display_header_footer", true))
	}
	if req.Options.HeaderTemplate != "" {
		d.setKVLocked(attribute.Int("pdf.request.options.header_template_len", len(req.Options.HeaderTemplate)))
	}
	if req.Options.FooterTemplate != "" {
		d.setKVLocked(attribute.Int("pdf.request.options.footer_template_len", len(req.Options.FooterTemplate)))
	}
	if req.Options.Margin.Top != "" {
		d.setKVLocked(attribute.String("pdf.request.options.margin_top", req.Options.Margin.Top))
	}
	if req.Options.Margin.Right != "" {
		d.setKVLocked(attribute.String("pdf.request.options.margin_right", req.Options.Margin.Right))
	}
	if req.Options.Margin.Bottom != "" {
		d.setKVLocked(attribute.String("pdf.request.options.margin_bottom", req.Options.Margin.Bottom))
	}
	if req.Options.Margin.Left != "" {
		d.setKVLocked(attribute.String("pdf.request.options.margin_left", req.Options.Margin.Left))
	}
}

func (d *RequestAttributes) SetQueueStats(depth, capacity int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.queue_depth", depth))
	d.setKVLocked(attribute.Int("pdf.process.queue_capacity", capacity))
}

func (d *RequestAttributes) SetSessionID(id int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.session.id", id))
}

func (d *RequestAttributes) SetConsoleErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.console_errors", count))
}

func (d *RequestAttributes) SetBrowserErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.browser_errors", count))
}

func (d *RequestAttributes) SetJSExceptions(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.js_exceptions", count))
}

func (d *RequestAttributes) SetBrowserLogsDropped(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.browser_logs_dropped", count))
}

func (d *RequestAttributes) SetRejection(reason string) {
	if d == nil || reason == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVIfAbsentLocked(attribute.String("pdf.response.rejection_reason", reason))
}

// SetPDFAConversion records whether and how the PDF was converted to PDF/A.
func (d *RequestAttributes) SetPDFAConversion(enabled bool, status string, inputSize, outputSize int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Bool("pdf.convert_to_pdfa.enabled", enabled))
	d.setKVLocked(attribute.Bool("pdf.convert_to_pdfa.applied", status == "success"))
	d.setKVLocked(attribute.String("pdf.convert_to_pdfa.status", status))
	d.setKVLocked(attribute.Int("pdf.convert_to_pdfa.input_size_bytes", inputSize))
	if outputSize > 0 {
		d.setKVLocked(attribute.Int("pdf.convert_to_pdfa.output_size_bytes", outputSize))
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
		d.setKVLocked(attribute.Bool("pdf.request.url.invalid", true))
		return
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		d.setKVLocked(attribute.Bool("pdf.request.url.invalid", true))
		return
	}

	path := u.EscapedPath()
	if path == "" {
		path = "/"
	}
	d.setKVLocked(attribute.String("pdf.request.url.scheme", u.Scheme))
	d.setKVLocked(attribute.String("pdf.request.url.host", u.Host))
	d.setKVLocked(attribute.String("pdf.request.url.path", path))
}

func (d *RequestAttributes) setWaitForLocked(waitFor *types.WaitFor) {
	if waitFor == nil {
		d.setKVLocked(attribute.String("pdf.request.wait_for.type", "load_event"))
		return
	}
	if _, ok := waitFor.AsString(); ok {
		d.setKVLocked(attribute.String("pdf.request.wait_for.type", "selector"))
		d.setKVLocked(attribute.Bool("pdf.request.wait_for.selector_present", true))
		return
	}
	if timeout, ok := waitFor.AsTimeout(); ok {
		d.setKVLocked(attribute.String("pdf.request.wait_for.type", "timeout"))
		d.setKVLocked(attribute.Int64("pdf.request.wait_for.timeout_ms", int64(timeout)))
		return
	}
	if opts, ok := waitFor.AsOptions(); ok {
		d.setKVLocked(attribute.String("pdf.request.wait_for.type", "options"))
		d.setKVLocked(attribute.Bool("pdf.request.wait_for.selector_present", opts.Selector != ""))
		if opts.Timeout != nil {
			d.setKVLocked(attribute.Int64("pdf.request.wait_for.timeout_ms", int64(*opts.Timeout)))
		}
		if opts.Visible != nil {
			d.setKVLocked(attribute.Bool("pdf.request.wait_for.visible", *opts.Visible))
		}
		if opts.Hidden != nil {
			d.setKVLocked(attribute.Bool("pdf.request.wait_for.hidden", *opts.Hidden))
		}
		return
	}

	d.setKVLocked(attribute.String("pdf.request.wait_for.type", "unknown"))
}
