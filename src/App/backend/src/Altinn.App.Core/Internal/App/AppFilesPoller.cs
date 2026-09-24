using System.Collections.Immutable;
using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Development only: polls the disk and replaces the snapshot in <see cref="AppFilesAccessor"/> when the app files
/// change, so that edits are picked up without a restart. When the changed files cannot be loaded the current snapshot
/// is kept, and the same broken state is not retried until the files change again.
/// </summary>
internal sealed class AppFilesPoller : BackgroundService
{
    internal static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(1);

    private readonly AppFilesAccessor _accessor;
    private readonly string _basePath;
    private readonly ILogger<AppFilesPoller> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly Channel<ReloadOutcome> _outcomes = Channel.CreateBounded<ReloadOutcome>(
        new BoundedChannelOptions(10) { FullMode = BoundedChannelFullMode.DropOldest }
    );
    private ImmutableArray<AppFileStamp> _failedStamps;

    /// <summary>
    /// The outcome of every poll, for tests.
    /// </summary>
    internal ChannelReader<ReloadOutcome> Outcomes => _outcomes.Reader;

    public AppFilesPoller(
        AppFilesAccessor accessor,
        string basePath,
        ILogger<AppFilesPoller> logger,
        TimeProvider? timeProvider = null
    )
    {
        _accessor = accessor;
        _basePath = basePath;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var timer = new PeriodicTimer(PollInterval, _timeProvider);
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                _outcomes.Writer.TryWrite(await Poll(stoppingToken));
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
    internal async Task<ReloadOutcome> Poll(CancellationToken cancellationToken)
    {
        AppFilesScan? scan = null;
        try
        {
            scan = AppFilesLoader.Scan(_basePath);
            if (_accessor.Current.IsLoadedFrom(scan) || Same(scan.Stamps, _failedStamps))
            {
                return ReloadOutcome.Unchanged;
            }

            _accessor.Update(await AppFilesLoader.Load(scan, cancellationToken));
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
            return ReloadOutcome.Failed;
        }

        _failedStamps = default;
        _logger.LogInformation("App files changed on disk and were reloaded");
        return ReloadOutcome.Reloaded;
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
