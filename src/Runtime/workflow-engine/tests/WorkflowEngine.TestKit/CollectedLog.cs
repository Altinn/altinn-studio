using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace WorkflowEngine.TestKit;

/// <summary>
/// A collected log record, with the trace and span it was written under (default when no activity was current).
/// </summary>
public sealed record CollectedLog(
    string Category,
    LogLevel Level,
    string Message,
    Exception? Exception,
    ActivityTraceId TraceId,
    ActivitySpanId SpanId
);
