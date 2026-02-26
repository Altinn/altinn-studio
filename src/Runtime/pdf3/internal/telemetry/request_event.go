package telemetry

import (
	"context"
	"net/url"
	"strings"
	"sync"

	"altinn.studio/pdf3/internal/types"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type requestEventKey struct{}

type RequestEventData struct {
	mu    sync.Mutex
	attrs []attribute.KeyValue
	index map[attribute.Key]int
}

func NewRequestEventData() *RequestEventData {
	return &RequestEventData{
		attrs: make([]attribute.KeyValue, 0, 64),
		index: make(map[attribute.Key]int, 64),
	}
}

func WithRequestEventData(ctx context.Context, data *RequestEventData) context.Context {
	if data == nil {
		return ctx
	}
	return context.WithValue(ctx, requestEventKey{}, data)
}

func RequestEventDataFromContext(ctx context.Context) *RequestEventData {
	if ctx == nil {
		return nil
	}
	if data, ok := ctx.Value(requestEventKey{}).(*RequestEventData); ok {
		return data
	}
	return nil
}

func (d *RequestEventData) SetPdfRequest(req types.PdfRequest) {
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

func (d *RequestEventData) SetQueueStats(depth, capacity int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.queue_depth", depth))
	d.setKVLocked(attribute.Int("pdf.process.queue_capacity", capacity))
}

func (d *RequestEventData) SetSessionID(id int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.session.id", id))
}

func (d *RequestEventData) SetConsoleErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.console_errors", count))
}

func (d *RequestEventData) SetBrowserErrors(count int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.browser_errors", count))
}

func (d *RequestEventData) SetCleanup(attempts int, succeeded bool, skipped bool) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.process.cleanup_attempts", attempts))
	d.setKVLocked(attribute.Bool("pdf.process.cleanup_succeeded", succeeded))
	d.setKVLocked(attribute.Bool("pdf.process.cleanup_skipped", skipped))
}

func (d *RequestEventData) SetResponseStatus(code int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.response.status_code", code))
}

func (d *RequestEventData) SetResponseSize(size int) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.Int("pdf.response.size_bytes", size))
}

func (d *RequestEventData) SetPDFError(pdfErr *types.PDFError) {
	if d == nil || pdfErr == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVLocked(attribute.String("pdf.response.error_type", pdfErr.Type.Error()))
	d.setKVIfAbsentLocked(attribute.String("pdf.response.error_message", pdfErr.Error()))
}

func (d *RequestEventData) SetRejection(reason string, _ error) {
	if d == nil || reason == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVIfAbsentLocked(attribute.String("pdf.response.rejection_reason", reason))
}

func (d *RequestEventData) SetErrorMessageIfEmpty(message string) {
	if d == nil || message == "" {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	d.setKVIfAbsentLocked(attribute.String("pdf.response.error_message", message))
}

func EmitRequestSummary(span trace.Span, data *RequestEventData) {
	if data == nil || !span.IsRecording() {
		return
	}

	data.mu.Lock()
	attrs := make([]attribute.KeyValue, len(data.attrs))
	copy(attrs, data.attrs)
	data.mu.Unlock()

	span.AddEvent("pdf.request.summary", trace.WithAttributes(attrs...))
}

func (d *RequestEventData) setKVLocked(kv attribute.KeyValue) {
	if idx, ok := d.index[kv.Key]; ok {
		d.attrs[idx] = kv
		return
	}
	d.index[kv.Key] = len(d.attrs)
	d.attrs = append(d.attrs, kv)
}

func (d *RequestEventData) setKVIfAbsentLocked(kv attribute.KeyValue) {
	if _, ok := d.index[kv.Key]; ok {
		return
	}
	d.index[kv.Key] = len(d.attrs)
	d.attrs = append(d.attrs, kv)
}

func (d *RequestEventData) setURLLocked(raw string) {
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

func (d *RequestEventData) setWaitForLocked(waitFor *types.WaitFor) {
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
