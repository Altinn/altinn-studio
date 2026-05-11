using System.Diagnostics;
using System.Globalization;
using System.Threading.Channels;

namespace Altinn.Studio.StudioctlServer.Platform;

internal sealed class FileLoggerProvider : ILoggerProvider
{
    // Keep the queue bounded so a noisy process cannot grow log buffering without limit.
    private const int Capacity = 1024;
    private readonly Channel<LogEntry> _channel;
    private readonly string _directory;
    private readonly string _logId;
    private readonly Task _writerTask;
    private StreamWriter _writer;
    private string _currentDate;
    private volatile bool _failed;

    public FileLoggerProvider(string directory)
    {
        if (string.IsNullOrWhiteSpace(directory))
            throw new InvalidOperationException("studioctl-server log directory is required");

        Directory.CreateDirectory(directory);
        _directory = directory;
        _logId = NextLogId(directory);
        _currentDate = UtcDate();
        _writer = OpenWriter(_currentDate);
        _channel = Channel.CreateBounded<LogEntry>(
            new BoundedChannelOptions(Capacity)
            {
                // The primary logging pipeline still captures everything; the file sink should never stall the process.
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
                RotateIfNeeded(entry.Date);
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
                Trace.TraceError($"studioctl-server file logger failed: {ex}");
            }
        }
    }

    private void RotateIfNeeded(string date)
    {
        if (date == _currentDate)
            return;

        _writer.Dispose();
        _currentDate = date;
        _writer = OpenWriter(date);
    }

    private StreamWriter OpenWriter(string date)
    {
        return new StreamWriter(new FileStream(LogPath(date), FileMode.Append, FileAccess.Write, FileShare.ReadWrite))
        {
            AutoFlush = true,
        };
    }

    private string LogPath(string date) =>
        Path.Combine(_directory, string.Create(CultureInfo.InvariantCulture, $"{date}-{_logId}.log"));

    private static string NextLogId(string directory)
    {
        var maxId = 0;
        foreach (var path in Directory.EnumerateFiles(directory, "*" + ".log"))
        {
            if (TryParseLogId(Path.GetFileName(path), out var id) && id > maxId)
                maxId = id;
        }

        return (maxId + 1).ToString(CultureInfo.InvariantCulture);
    }

    private static bool TryParseLogId(string? fileName, out int id)
    {
        id = 0;
        const int dateLength = 10;
        if (
            string.IsNullOrWhiteSpace(fileName)
            || !fileName.EndsWith(".log", StringComparison.Ordinal)
            || fileName.Length < dateLength + "-1.log".Length
            || fileName[dateLength] != '-'
        )
        {
            return false;
        }

        if (
            !DateTime.TryParseExact(
                fileName[..dateLength],
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out _
            )
        )
        {
            return false;
        }

        var idValue = fileName[(dateLength + 1)..^".log".Length];
        return int.TryParse(idValue, NumberStyles.None, CultureInfo.InvariantCulture, out id) && id > 0;
    }

    private static string UtcDate() => DateTimeOffset.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private readonly record struct LogEntry(string Date, string Prefix, string Message, Exception? Exception);

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

            var utcNow = DateTimeOffset.UtcNow;
            var localNow = utcNow.ToLocalTime();
            var entry = new LogEntry(
                utcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"{localNow:yyyy-MM-dd HH:mm:ss.fff} {GetLevelName(logLevel)}: {categoryName}[{eventId.Id}] "
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
