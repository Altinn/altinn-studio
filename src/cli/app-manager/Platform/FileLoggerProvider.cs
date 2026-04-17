using System.Diagnostics;
using System.Globalization;
using System.Threading.Channels;

namespace Altinn.Studio.AppManager.Platform;

internal sealed class FileLoggerProvider : ILoggerProvider
{
    // Keep the queue bounded so a noisy process cannot grow log buffering without limit.
    private const int Capacity = 1024;
    private readonly Channel<LogEntry> _channel;
    private readonly StreamWriter _writer;
    private readonly Task _writerTask;
    private volatile bool _failed;

    public FileLoggerProvider(string path)
    {
        var parent = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(parent))
            throw new InvalidOperationException($"app-manager log path must include a parent directory: {path}");

        Directory.CreateDirectory(parent);
        _writer = new StreamWriter(new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite))
        {
            AutoFlush = true,
        };
        _channel = Channel.CreateBounded<LogEntry>(
            new BoundedChannelOptions(Capacity)
            {
                // Console logging still captures everything; the file sink should never stall the process.
                FullMode = BoundedChannelFullMode.DropWrite,
                SingleReader = true,
                SingleWriter = false,
            }
        );
        _writerTask = Task.Run(WriteLoop);
    }

    public ILogger CreateLogger(string categoryName) => new FileLogger(categoryName, _channel.Writer, this);

    public void Dispose()
    {
        _channel.Writer.TryComplete();
        _writerTask.Wait();
        _writer.Dispose();
    }

    private async Task WriteLoop()
    {
        try
        {
            await foreach (var entry in _channel.Reader.ReadAllAsync())
            {
                await _writer.WriteAsync(entry.Prefix);
                await _writer.WriteLineAsync(entry.Message);

                if (entry.Exception is not null)
                    await _writer.WriteLineAsync(entry.Exception.ToString());
            }
        }
        catch (Exception ex)
        {
            if (!_failed)
            {
                _failed = true;
                try
                {
                    await Console.Error.WriteLineAsync($"app-manager file logger failed: {ex}");
                }
                catch (Exception reportException)
                {
                    Debug.WriteLine(reportException);
                }
            }
        }
    }

    private readonly record struct LogEntry(string Prefix, string Message, Exception? Exception);

    private sealed class FileLogger(string categoryName, ChannelWriter<LogEntry> writer, FileLoggerProvider provider)
        : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            if (!IsEnabled(logLevel))
                return;

            var message = formatter(state, exception);
            if (string.IsNullOrWhiteSpace(message) && exception is null)
                return;

            if (provider._failed)
                return;

            var entry = new LogEntry(
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss.fff} {GetLevelName(logLevel)}: {categoryName}[{eventId.Id}] "
                ),
                message,
                exception
            );

            writer.TryWrite(entry);
        }

        private static string GetLevelName(LogLevel logLevel) =>
            logLevel switch
            {
                LogLevel.Trace => "trce",
                LogLevel.Debug => "dbug",
                LogLevel.Information => "info",
                LogLevel.Warning => "warn",
                LogLevel.Error => "fail",
                LogLevel.Critical => "crit",
                _ => "none",
            };
    }
}
