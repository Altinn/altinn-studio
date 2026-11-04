using System.Collections.Immutable;
using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Logs the diagnostics of the app files snapshot at startup, in every environment. In Development it also polls the
/// disk and replaces the snapshot in <see cref="AppFilesAccessor"/> when the app files change, so that edits are picked
/// up without a restart. When the changed files cannot be loaded or parsed the current snapshot is kept, and the same
/// broken state is not retried until the files change again.
/// </summary>
internal sealed class AppFilesHostedService : BackgroundService
{
    internal static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(1);

    private readonly AppFilesAccessor _accessor;
    private readonly IHostEnvironment _env;
    private readonly ILogger<AppFilesHostedService> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly Channel<ReloadOutcome> _outcomes = Channel.CreateBounded<ReloadOutcome>(
        new BoundedChannelOptions(10) { FullMode = BoundedChannelFullMode.DropOldest }
    );
    private ImmutableArray<AppFileStamp> _failedStamps;

    /// <summary>
    /// The outcome of every poll, for tests.
    /// </summary>
    internal ChannelReader<ReloadOutcome> Outcomes => _outcomes.Reader;

    public AppFilesHostedService(
        AppFilesAccessor accessor,
        IHostEnvironment env,
        ILogger<AppFilesHostedService> logger,
        TimeProvider? timeProvider = null
    )
    {
        _accessor = accessor;
        _env = env;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>
    /// Logs the diagnostics of the startup snapshot, then polls for changes in Development.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        LogDiagnostics(_logger, _accessor.Parsed);
        try
        {
            if (!_env.IsDevelopment())
            {
                return;
            }

            using var timer = new PeriodicTimer(PollInterval, _timeProvider);
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                _outcomes.Writer.TryWrite(Poll());
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Host is shutting down
        }
        finally
        {
            _outcomes.Writer.TryComplete();
        }
    }

    /// <summary>
    /// Replaces the snapshot when the files on disk differ from the ones it was loaded from.
    /// </summary>
    internal ReloadOutcome Poll()
    {
        AppFilesScan? scan = null;
        try
        {
            scan = AppFilesLoader.Scan(_env.ContentRootPath);
            if (_accessor.Current.IsLoadedFrom(scan) || Same(scan.Stamps, _failedStamps))
            {
                return ReloadOutcome.Unchanged;
            }

            _accessor.Update(AppFilesLoader.Load(scan));
        }
        catch (ApplicationConfigException e) when (scan is not null)
        {
            _logger.LogWarning(
                "App files changed on disk, but the previous version is kept in memory. {Message}",
                e.Message
            );
            _failedStamps = scan.Stamps;
            return ReloadOutcome.Failed;
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            _logger.LogError(e, "Failed to check the app files for changes");
            // Scanned files that failed, such as through a bug in a parser, would fail the same way again, so they are
            // not retried until they change. A failed scan is retried on the next poll.
            if (scan is not null)
            {
                _failedStamps = scan.Stamps;
            }

            return ReloadOutcome.Failed;
        }

        _failedStamps = default;
        _logger.LogInformation("App files changed on disk and were reloaded");
        LogDiagnostics(_logger, _accessor.Parsed);
        return ReloadOutcome.Reloaded;
    }

    /// <summary>
    /// Logs every diagnostic of the snapshot at its own level.
    /// </summary>
    internal static void LogDiagnostics(ILogger logger, ParsedAppFiles parsed)
    {
        foreach (var diagnostic in parsed.Diagnostics)
        {
            logger.Log(diagnostic.Level, "{Path}: {Message}", diagnostic.Path, diagnostic.Message);
        }
    }

    private static bool Same(ImmutableArray<AppFileStamp> a, ImmutableArray<AppFileStamp> b) =>
        !a.IsDefault && !b.IsDefault && a.AsSpan().SequenceEqual(b.AsSpan());

    internal enum ReloadOutcome
    {
        Unchanged,
        Reloaded,
        Failed,
    }
}
