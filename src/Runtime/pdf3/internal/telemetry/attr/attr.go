// Package attr names the attributes pdf3 puts on its spans and log records: the OpenTelemetry
// semantic conventions it sets itself, the shared Altinn vocabulary, and pdf3's own under
// altinn.pdf (https://github.com/Altinn/altinn-studio/issues/21073).
//
// A concept has one name on every signal: a log record about a request uses the key the
// request's span uses. No attribute name is a string literal at a call site. The package imports
// nothing, so every package, including log and assert, can use it.
package attr

// Semantic conventions pdf3 sets on log records. Spans and metrics take these from semconv.
const (
	DeploymentEnvironmentName = "deployment.environment.name"
	ErrorType                 = "error.type"
	HTTPResponseStatusCode    = "http.response.status_code"
)

// Error is the key for an error value on a log record. The OpenTelemetry log bridge moves it to
// the record's exception.message and exception.type, so it is never exported under this key.
const Error = "error"

// The shared Altinn vocabulary.
const (
	ServiceOwner = "altinn.service_owner"
)

const prefix = "altinn.pdf."

// The process and the part of it that logs.
const (
	Component     = prefix + "component"
	GoMaxProcs    = prefix + "gomaxprocs"
	NumCPU        = prefix + "num_cpu"
	ListenAddress = prefix + "listen_address"
	TestID        = prefix + "test.id"

	// Duration is how long the operation the record reports took. Elapsed is the time since the
	// request started, for a record in the middle of it.
	Duration = prefix + "duration"
	Elapsed  = prefix + "elapsed"

	// Attempt is the attempt the record is about, starting at 0 for the first try.
	Attempt    = prefix + "attempt"
	MaxRetries = prefix + "max_retries"
)

// Configuration read from the environment.
const (
	ConfigEnvVar     = prefix + "config.env_var"
	ConfigValue      = prefix + "config.value"
	ConfigDefault    = prefix + "config.default"
	ConfigEnableWith = prefix + "config.enable_with"
)

// The PDF request: the page to print and how. The URL is the page's, not the HTTP request's,
// which url.* describes.
const (
	RequestURL                    = prefix + "request.url"
	RequestURLScheme              = prefix + "request.url.scheme"
	RequestURLHost                = prefix + "request.url.host"
	RequestURLPath                = prefix + "request.url.path"
	RequestURLInvalid             = prefix + "request.url.invalid"
	RequestCookiesCount           = prefix + "request.cookies.count"
	RequestCookiesNames           = prefix + "request.cookies.names"
	RequestCookiesValueLengths    = prefix + "request.cookies.value_lengths"
	RequestCookieName             = prefix + "request.cookie.name"
	RequestSetJavaScriptEnabled   = prefix + "request.set_javascript_enabled"
	RequestOptionsFormat          = prefix + "request.options.format"
	RequestOptionsPrintBackground = prefix + "request.options.print_background"
	RequestOptionsDisplayHeader   = prefix + "request.options.display_header_footer"
	RequestOptionsHeaderLength    = prefix + "request.options.header_template_len"
	RequestOptionsFooterLength    = prefix + "request.options.footer_template_len"
	RequestOptionsMarginTop       = prefix + "request.options.margin_top"
	RequestOptionsMarginRight     = prefix + "request.options.margin_right"
	RequestOptionsMarginBottom    = prefix + "request.options.margin_bottom"
	RequestOptionsMarginLeft      = prefix + "request.options.margin_left"

	// RequestWaitFor is the request's waitFor as JSON, for a log record about a wait that failed.
	RequestWaitFor                = prefix + "request.wait_for"
	RequestWaitForType            = prefix + "request.wait_for.type"
	RequestWaitForSelector        = prefix + "request.wait_for.selector"
	RequestWaitForSelectorPresent = prefix + "request.wait_for.selector_present"
	RequestWaitForTimeoutMs       = prefix + "request.wait_for.timeout_ms"
	RequestWaitForVisible         = prefix + "request.wait_for.visible"
	RequestWaitForHidden          = prefix + "request.wait_for.hidden"

	// URLKind and URLRejection classify the request's URL as an app URL, on the proxy's spans
	// and request metrics.
	URLKind      = prefix + "url_kind"
	URLRejection = prefix + "url_rejection"

	// LocaltestURLRewriteReason, LocaltestURLRewriteFrom and LocaltestURLRewriteTo describe how
	// the worker rewrote a localtest request's URL.
	LocaltestURLRewriteReason = prefix + "localtest.url_rewrite.reason"
	LocaltestURLRewriteFrom   = prefix + "localtest.url_rewrite.from"
	LocaltestURLRewriteTo     = prefix + "localtest.url_rewrite.to"
)

// The response to the PDF request.
const (
	ResponseRejectionReason = prefix + "response.rejection_reason"
	ResponseSizeBytes       = prefix + "response.size_bytes"

	// ErrorDetail is the problem details a failed request was answered with.
	ErrorDetail = prefix + "error.detail"
)

// The worker that generated the PDF, as the proxy and the worker itself record it.
const (
	WorkerID      = prefix + "worker.id"
	WorkerIP      = prefix + "worker.ip"
	WorkerAddress = prefix + "worker.address"
)

// The worker's request queue.
const (
	QueueDepth    = prefix + "queue.depth"
	QueueCapacity = prefix + "queue.capacity"
)

// The browser session a request ran in, and the restarts that replace it.
const (
	SessionID             = prefix + "session.id"
	SessionOldID          = prefix + "session.old_id"
	SessionNewID          = prefix + "session.new_id"
	SessionDrained        = prefix + "session.drained"
	SessionDrainTimeoutMs = prefix + "session.drain_timeout_ms"
	RestartIntervalMs     = prefix + "restart.interval_ms"
	RestartRecheckInMs    = prefix + "restart.recheck_in_ms"
)

// What the page reported as errors while it served a request: the counts, on its entry span, and
// each error, in a log record of its own. An error's message is truncated, and its URLs, like the
// URL it came from, are without user information, query or fragment.
const (
	PageConsoleErrors   = prefix + "page.console_errors"
	PageBrowserErrors   = prefix + "page.browser_errors"
	PageJSExceptions    = prefix + "page.js_exceptions"
	PageErrorsNotLogged = prefix + "page.errors_not_logged"
	PageErrorMessage    = prefix + "page.error.message"
	PageErrorURL        = prefix + "page.error.url"

	// PageErrorLogSource is the part of the browser an error it reported came from, such as network
	// for a resource that failed to load.
	PageErrorLogSource = prefix + "page.error.log_source"
)

// WaitException is the exception the expression that waits for the request's waitFor threw,
// truncated.
const WaitException = prefix + "wait.exception"

// The reset of the browser session after a request.
const (
	CleanupAttempts     = prefix + "cleanup.attempts"
	CleanupSucceeded    = prefix + "cleanup.succeeded"
	CleanupSkipped      = prefix + "cleanup.skipped"
	CleanupDelaySeconds = prefix + "cleanup.delay_seconds"
)

// Conversion of the PDF to PDF/A.
const (
	ConvertToPDFAEnabled         = prefix + "convert_to_pdfa.enabled"
	ConvertToPDFAApplied         = prefix + "convert_to_pdfa.applied"
	ConvertToPDFAStatus          = prefix + "convert_to_pdfa.status"
	ConvertToPDFAInputSizeBytes  = prefix + "convert_to_pdfa.input_size_bytes"
	ConvertToPDFAOutputSizeBytes = prefix + "convert_to_pdfa.output_size_bytes"
)

// The browser process. browser.* is the semantic conventions' namespace for the browser a user
// runs, so pdf3's are under altinn.pdf.browser.
const (
	BrowserVersionProduct  = prefix + "browser.version.product"
	BrowserVersionRevision = prefix + "browser.version.revision"
	BrowserVersionProtocol = prefix + "browser.version.protocol"
	BrowserPath            = prefix + "browser.path"
	BrowserDebugPort       = prefix + "browser.debug_port"
	BrowserDataDir         = prefix + "browser.data_dir"
	BrowserPGID            = prefix + "browser.pgid"
	BrowserArgs            = prefix + "browser.args"
	BrowserOutput          = prefix + "browser.output"
)

// The Chrome DevTools Protocol connection to the browser.
const (
	CDPURL             = prefix + "cdp.url"
	CDPCommandID       = prefix + "cdp.command_id"
	CDPPendingCommands = prefix + "cdp.pending_commands"
	CDPPayloadBytes    = prefix + "cdp.payload_bytes"
	CDPCloseCode       = prefix + "cdp.close.code"
	CDPCloseText       = prefix + "cdp.close.text"
	CDPTargetCount     = prefix + "cdp.target_count"
	CDPTargetIndex     = prefix + "cdp.target.index"
	CDPTargetType      = prefix + "cdp.target.type"
	CDPTargetID        = prefix + "cdp.target.id"
	CDPTargetURL       = prefix + "cdp.target.url"
)

// AssertMessage is a failed assertion's message.
const AssertMessage = prefix + "assert.message"
