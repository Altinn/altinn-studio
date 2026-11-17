using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace WorkflowEngine.Core.Tests;

internal sealed record CapturedLogEntry(
    string Category,
    LogLevel Level,
    Exception? Exception,
    ActivityTraceId? TraceId
);

/// <summary>
/// Records each log entry with the trace it was written in, as an OpenTelemetry log exporter would see it.
/// </summary>
internal sealed class TraceCapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<CapturedLogEntry> Entries { get; } = [];

    public ILogger CreateLogger(string categoryName) => new TraceCapturingLogger(categoryName, Entries);

    public ILogger<T> CreateLogger<T>() => new TraceCapturingLogger<T>(Entries);

    public void Dispose() { }

    private class TraceCapturingLogger(string category, ConcurrentQueue<CapturedLogEntry> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        ) => entries.Enqueue(new CapturedLogEntry(category, logLevel, exception, Activity.Current?.TraceId));
    }

    private sealed class TraceCapturingLogger<T>(ConcurrentQueue<CapturedLogEntry> entries)
        : TraceCapturingLogger(typeof(T).FullName ?? typeof(T).Name, entries),
            ILogger<T>;
}
