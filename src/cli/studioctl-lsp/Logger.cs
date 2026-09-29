namespace Altinn.Studio.AppConfigLsp;

public enum LogLevel
{
    Error,
    Warning,
    Info,
    Debug,
    Trace,
}

/// <summary>Leveled logging to stderr (stdout carries the protocol).</summary>
internal sealed class Logger(LogLevel level)
{
    public LogLevel Level { get; } = level;

    public void Log(LogLevel level, string message)
    {
        if (level > Level)
            return;
        Console.Error.WriteLine(
            $"[{DateTime.Now:HH:mm:ss.fff}] studioctl-lsp {level.ToString().ToLowerInvariant()}: {message}"
        );
    }

    public static LogLevel ParseLevel(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "error" => LogLevel.Error,
            "warn" or "warning" => LogLevel.Warning,
            "debug" => LogLevel.Debug,
            "trace" => LogLevel.Trace,
            _ => LogLevel.Info,
        };
}
