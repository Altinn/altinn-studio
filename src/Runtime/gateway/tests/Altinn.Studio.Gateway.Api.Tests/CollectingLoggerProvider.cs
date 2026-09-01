using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Gateway.Api.Tests;

internal sealed record CollectedLogEntry(string Category, LogLevel Level, string Message);

/// <summary>Captures log entries so tests can assert on emitted log lines (e.g. audit lines).</summary>
internal sealed class CollectingLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<CollectedLogEntry> _entries = new();

    public IReadOnlyList<CollectedLogEntry> Entries => [.. _entries];

    public void Clear() => _entries.Clear();

    public ILogger CreateLogger(string categoryName) => new CollectingLogger(categoryName, _entries);

    public void Dispose()
    {
        // Nothing to dispose
    }

    private sealed class CollectingLogger(string _category, ConcurrentQueue<CollectedLogEntry> _entries) : ILogger
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
        ) => _entries.Enqueue(new CollectedLogEntry(_category, logLevel, formatter(state, exception)));
    }
}
