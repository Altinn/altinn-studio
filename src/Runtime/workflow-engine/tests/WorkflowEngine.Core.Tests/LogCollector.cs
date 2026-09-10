using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Captures every entry written through a logger factory it is registered with as an <see cref="ILoggerProvider"/>,
/// rendered, with its level.
/// </summary>
internal sealed class LogCollector : ILoggerProvider, ILogger
{
    public ConcurrentQueue<(LogLevel Level, string Message)> Entries { get; } = new();

    public ILogger CreateLogger(string categoryName) => this;

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter
    ) => Entries.Enqueue((logLevel, formatter(state, exception)));

    public void Dispose() { }
}
