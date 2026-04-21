using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

internal abstract class Logger : ILogger
{
    protected static string? GetMessage<TState>(
        TState state,
        Exception? exception,
        Func<TState, Exception?, string?> formatter
    )
    {
        return exception == null
            ? formatter(state, null)
            : $"{formatter(state, exception)}{Environment.NewLine}{exception}";
    }

    protected abstract void Log<TState>(
        TState state,
        Exception? exception,
        Func<TState, Exception?, string?> formatter
    );

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string?> formatter
    )
    {
        Log(state, exception, formatter);
    }

    public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

    public IDisposable BeginScope<TState>(TState state)
        where TState : notnull => new NullScope();
}

internal sealed class FixtureLogger(long _fixtureInstance, string _name, string _scenario) : Logger
{
    private readonly Stopwatch _timer = Stopwatch.StartNew();

    protected override void Log<TState>(TState state, Exception? exception, Func<TState, Exception?, string?> formatter)
    {
        var message = GetMessage(state, exception, formatter);
        var prefix = $"{_fixtureInstance:00}/{_name}/{_scenario}";
        Console.Out.WriteLine($"[{prefix} {_timer.Elapsed:hh\\:mm\\:ss\\.ff}] {message}");
    }
}

internal sealed class TestOutputLogger(ITestOutputHelper? output, long _fixtureInstance, string _name, string _scenario)
    : Logger
{
    private ITestOutputHelper? _output = output;
    private long _currentFixtureInstance = _fixtureInstance;
    private readonly Stopwatch _timer = Stopwatch.StartNew();

    /// <summary>
    /// Updates the output helper for a new test method
    /// </summary>
    public void UpdateOutput(ITestOutputHelper? output, long? fixtureInstance = null)
    {
        _output = output;
        if (fixtureInstance.HasValue)
        {
            _currentFixtureInstance = fixtureInstance.Value;
        }
    }

    protected override void Log<TState>(TState state, Exception? exception, Func<TState, Exception?, string?> formatter)
    {
        if (_output == null)
        {
            return;
        }

        var message = GetMessage(state, exception, formatter);
        var prefix = $"{_currentFixtureInstance:00}/{_name}/{_scenario}";
        _output.WriteLine($"[{prefix} {_timer.Elapsed:hh\\:mm\\:ss\\.ff}] {message}");
    }
}

internal sealed class NullScope : IDisposable
{
    public void Dispose() { }
}
