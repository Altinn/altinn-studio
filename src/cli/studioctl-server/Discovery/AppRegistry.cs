using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Altinn.Studio.StudioctlServer.Discovery;

internal sealed class AppRegistry : BackgroundService
{
    private const int MaxConcurrentProbes = 8;
    private static readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan _startupPollInterval = TimeSpan.FromMilliseconds(500);

    private readonly IReadOnlyList<IAppDiscovery> _discoveries;
    private readonly AppMetadataProbe _probe;
    private readonly LocaltestStorageProbe _storageProbe;
    private readonly ILogger<AppRegistry> _logger;
    private readonly Channel<AppRegistryMessage> _messages = Channel.CreateUnbounded<AppRegistryMessage>();
    private readonly List<AppStartWaiter> _pendingStarts = [];

    private DiscoveredApp[] _apps = [];
    private bool _lastRefreshFailed;
    private Action? _changed;

    public AppRegistry(
        IEnumerable<IAppDiscovery> discoveries,
        AppMetadataProbe probe,
        LocaltestStorageProbe storageProbe,
        ILogger<AppRegistry> logger
    )
    {
        _discoveries = [.. discoveries];
        _probe = probe;
        _storageProbe = storageProbe;
        _logger = logger;
    }

    public IReadOnlyList<DiscoveredApp> GetAll() => [.. Volatile.Read(ref _apps)];

    public IDisposable OnChanged(Action callback)
    {
        ArgumentNullException.ThrowIfNull(callback);
        _changed += callback;
        return new ChangeSubscription(this, callback);
    }

    public IReadOnlyList<DiscoveredApp> GetByAppId(string appId)
    {
        List<DiscoveredApp>? apps = null;
        foreach (var candidate in Volatile.Read(ref _apps))
        {
            if (!string.Equals(candidate.AppId, appId, StringComparison.OrdinalIgnoreCase))
                continue;

            apps ??= [];
            apps.Add(candidate);
        }

        return apps ?? [];
    }

    public async Task<Uri> AppStarted(
        string appId,
        int? processId,
        string? containerId,
        int? hostPort,
        TimeSpan timeout,
        CancellationToken cancellationToken
    )
    {
        var waiter = new AppStartWaiter(appId, processId, containerId, hostPort, DateTimeOffset.UtcNow + timeout);
        using var cancellation = cancellationToken.Register(
            static state =>
            {
                if (state is not AppStartWaiter waiter)
                    throw new InvalidOperationException("Missing app start waiter");
                waiter.TrySetCanceled();
            },
            waiter
        );
        await _messages.Writer.WriteAsync(new AppStartedMessage(waiter), cancellationToken);
        return await waiter.Task;
    }

    public void AppStopped(string? appId) =>
        _messages.Writer.TryWrite(new AppStoppedMessage(string.IsNullOrWhiteSpace(appId) ? null : appId.Trim()));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var nextPoll = DateTimeOffset.MinValue;
        var readTask = _messages.Reader.ReadAsync(stoppingToken).AsTask();
        var timerTask = Task.Delay(_startupPollInterval, stoppingToken);
        AppRegistryMessage? currentMessage = null;

        try
        {
            try
            {
                nextPoll = await HandleMessage(new TimerTick(), nextPoll, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "App discovery refresh failed");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                var completed = await Task.WhenAny(readTask, timerTask);

                AppRegistryMessage message;
                if (completed == readTask)
                {
                    message = await readTask;
                    readTask = _messages.Reader.ReadAsync(stoppingToken).AsTask();
                }
                else
                {
                    await timerTask;
                    message = new TimerTick();
                    timerTask = Task.Delay(_startupPollInterval, stoppingToken);
                }

                currentMessage = message;
                try
                {
                    nextPoll = await HandleMessage(message, nextPoll, stoppingToken);
                    currentMessage = null;
                }
                catch (Exception ex)
                    when (ex is not OperationCanceledException || !stoppingToken.IsCancellationRequested)
                {
                    currentMessage = null;
                    _logger.LogError(ex, "App discovery refresh failed");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            if (currentMessage is AppStartedMessage started)
                started.Waiter.TrySetCanceled();
        }
        finally
        {
            CancelQueuedMessages();
            CancelPendingStarts();
        }
    }

    private async Task<DateTimeOffset> HandleMessage(
        AppRegistryMessage message,
        DateTimeOffset nextPoll,
        CancellationToken cancellationToken
    )
    {
        var now = DateTimeOffset.UtcNow;
        var shouldRefresh =
            message is not TimerTick || (_pendingStarts.Count > 0 && !_lastRefreshFailed) || now >= nextPoll;
        if (!shouldRefresh)
        {
            PrunePendingStarts(now);
            return nextPoll;
        }

        switch (message)
        {
            case AppStartedMessage started:
                _pendingStarts.Add(started.Waiter);
                break;
            case AppStoppedMessage stopped when stopped.AppId is { } appId:
                if (_logger.IsEnabled(LogLevel.Debug))
                    _logger.LogDebug("App stopped notification received for {AppId}", appId);
                break;
            case AppStoppedMessage:
                if (_logger.IsEnabled(LogLevel.Debug))
                    _logger.LogDebug("App stopped notification received");
                break;
        }

        try
        {
            await Refresh(cancellationToken);
            _lastRefreshFailed = false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            _lastRefreshFailed = true;
            _logger.LogError(ex, "App discovery refresh failed");
        }
        finally
        {
            PrunePendingStarts(DateTimeOffset.UtcNow);
        }

        return now >= nextPoll ? now + _pollInterval : nextPoll;
    }

    private async Task Refresh(CancellationToken cancellationToken)
    {
        var previous = Volatile.Read(ref _apps);

        var apps = await DiscoverApps(cancellationToken);
        if (!previous.SequenceEqual(apps))
        {
            Volatile.Write(ref _apps, apps);
            LogRefresh(previous, apps);
            _changed?.Invoke();
        }

        await CompleteReadyStarts(apps, cancellationToken);
    }

    private void RemoveChangedCallback(Action callback) => _changed -= callback;

    private async Task<DiscoveredApp[]> DiscoverApps(CancellationToken cancellationToken)
    {
        var probeResults = new ConcurrentBag<ProbeResult>();
        var discoveryItems = _discoveries.Select(static (discovery, index) => new DiscoveryItem(index, discovery));
        var discoveryOptions = new ParallelOptions { CancellationToken = cancellationToken };

        await Parallel.ForEachAsync(
            discoveryItems,
            discoveryOptions,
            async (discoveryItem, discoveryCancellationToken) =>
            {
                var candidates = await discoveryItem.Discovery.Discover(discoveryCancellationToken);
                var candidateItems = candidates.Select(
                    static (candidate, index) => new CandidateItem(index, candidate)
                );
                var candidateOptions = new ParallelOptions
                {
                    CancellationToken = discoveryCancellationToken,
                    MaxDegreeOfParallelism = MaxConcurrentProbes,
                };

                await Parallel.ForEachAsync(
                    candidateItems,
                    candidateOptions,
                    async (candidateItem, probeCancellationToken) =>
                    {
                        var app = await ProbeCandidate(candidateItem.Candidate, probeCancellationToken);
                        if (app is not null)
                            probeResults.Add(new ProbeResult(discoveryItem.Index, candidateItem.Index, app));
                    }
                );
            }
        );

        var apps = new Dictionary<AppKey, DiscoveredApp>();
        foreach (
            var result in probeResults
                .OrderBy(static result => result.DiscoveryIndex)
                .ThenBy(static result => result.CandidateIndex)
        )
        {
            apps[AppKey.From(result.App)] = result.App;
        }

        return [.. apps.Values];
    }

    private async Task<DiscoveredApp?> ProbeCandidate(
        AppDiscoveryCandidate candidate,
        CancellationToken cancellationToken
    )
    {
        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug(
                "Probing discovery candidate {Source} {BaseUri} {Description}",
                candidate.Source,
                candidate.BaseUri,
                candidate.Description
            );
        }

        var appId = await _probe.Probe(candidate.BaseUri, cancellationToken);
        if (string.IsNullOrWhiteSpace(appId))
            return null;

        var baseUri = AppEndpointUri.From(candidate.BaseUri);
        return new DiscoveredApp(
            appId,
            baseUri,
            candidate.Source,
            candidate.ProcessId,
            candidate.Description,
            candidate.ContainerId,
            candidate.Name,
            candidate.HostPort ?? baseUri.Port
        );
    }

    private async Task CompleteReadyStarts(IReadOnlyList<DiscoveredApp> apps, CancellationToken cancellationToken)
    {
        for (var i = _pendingStarts.Count - 1; i >= 0; i--)
        {
            var waiter = _pendingStarts[i];
            if (waiter.IsCompleted)
            {
                _pendingStarts.RemoveAt(i);
                continue;
            }

            var app = apps.FirstOrDefault(waiter.Matches);
            if (app is null)
                continue;

            if (
                await _storageProbe.ProbeApplicationMetadata(app.AppId, cancellationToken)
                is LocaltestStorageProbeResult.NotReady
            )
                continue;

            waiter.TrySetResult(app.BaseUri.Value);
            _pendingStarts.RemoveAt(i);
        }
    }

    private void PrunePendingStarts(DateTimeOffset now)
    {
        for (var i = _pendingStarts.Count - 1; i >= 0; i--)
        {
            var waiter = _pendingStarts[i];
            if (waiter.IsCompleted)
            {
                _pendingStarts.RemoveAt(i);
                continue;
            }

            if (now < waiter.Deadline)
                continue;

            waiter.TrySetException(
                new TimeoutException("matching app endpoint not found or not reachable through localtest storage")
            );
            _pendingStarts.RemoveAt(i);
        }
    }

    private void CancelPendingStarts()
    {
        foreach (var waiter in _pendingStarts)
            waiter.TrySetCanceled();
        _pendingStarts.Clear();
    }

    private void CancelQueuedMessages()
    {
        while (_messages.Reader.TryRead(out var message))
            if (message is AppStartedMessage started)
                started.Waiter.TrySetCanceled();
    }

    private void LogRefresh(IReadOnlyList<DiscoveredApp> previousApps, IReadOnlyList<DiscoveredApp> apps)
    {
        if (!_logger.IsEnabled(LogLevel.Information))
            return;

        foreach (var app in apps)
        {
            var appKey = AppKey.From(app);
            var previous = previousApps.FirstOrDefault(previousApp => AppKey.From(previousApp) == appKey);
            if (previous is null)
            {
                _logger.LogInformation(
                    "Discovered app {AppId} on {BaseUri} via {Source}",
                    app.AppId,
                    app.BaseUri,
                    app.Source
                );
            }
        }

        foreach (var previous in previousApps)
        {
            var previousKey = AppKey.From(previous);
            if (apps.Any(app => AppKey.From(app) == previousKey))
                continue;

            _logger.LogInformation("Removed app {AppId} from {BaseUri}", previous.AppId, previous.BaseUri);
        }
    }

    private readonly record struct AppKey(string AppId, AppEndpointUri BaseUri)
    {
        public static AppKey From(DiscoveredApp app) => new(app.AppId.ToUpperInvariant(), app.BaseUri);
    }

    private abstract record AppRegistryMessage;

    private sealed record TimerTick : AppRegistryMessage;

    private sealed record AppStartedMessage(AppStartWaiter Waiter) : AppRegistryMessage;

    private sealed record DiscoveryItem(int Index, IAppDiscovery Discovery);

    private sealed record CandidateItem(int Index, AppDiscoveryCandidate Candidate);

    private sealed record ProbeResult(int DiscoveryIndex, int CandidateIndex, DiscoveredApp App);

    private sealed record AppStoppedMessage(string? AppId) : AppRegistryMessage;

    private sealed class AppStartWaiter
    {
        private readonly TaskCompletionSource<Uri> _result = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public AppStartWaiter(string appId, int? processId, string? containerId, int? hostPort, DateTimeOffset deadline)
        {
            AppId = appId;
            ProcessId = processId;
            ContainerId = string.IsNullOrWhiteSpace(containerId) ? null : containerId.Trim();
            HostPort = hostPort;
            Deadline = deadline;
        }

        public string AppId { get; }
        public int? ProcessId { get; }
        public string? ContainerId { get; }
        public int? HostPort { get; }
        public DateTimeOffset Deadline { get; }
        public Task<Uri> Task => _result.Task;
        public bool IsCompleted => _result.Task.IsCompleted;

        public bool Matches(DiscoveredApp app)
        {
            if (!string.Equals(app.AppId, AppId, StringComparison.OrdinalIgnoreCase))
                return false;

            if (ProcessId.HasValue && app.ProcessId != ProcessId)
                return false;

            if (
                !string.IsNullOrWhiteSpace(ContainerId)
                && !string.Equals(app.ContainerId, ContainerId, StringComparison.Ordinal)
            )
                return false;

            return !HostPort.HasValue || app.HostPort == HostPort || app.BaseUri.Port == HostPort;
        }

        public void TrySetResult(Uri baseUri) => _result.TrySetResult(baseUri);

        public void TrySetException(Exception exception) => _result.TrySetException(exception);

        public void TrySetCanceled() => _result.TrySetCanceled();
    }

    private sealed class ChangeSubscription : IDisposable
    {
        private readonly AppRegistry _registry;
        private Action? _callback;

        public ChangeSubscription(AppRegistry registry, Action callback)
        {
            _registry = registry;
            _callback = callback;
        }

        public void Dispose()
        {
            var callback = Interlocked.Exchange(ref _callback, null);
            if (callback is not null)
            {
                _registry.RemoveChangedCallback(callback);
            }
        }
    }
}
