namespace Altinn.Studio.AppManager.Discovery;

internal sealed class AppRegistry : BackgroundService
{
    private static readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);

    private readonly IReadOnlyList<IAppDiscovery> _discoveries;
    private readonly AppMetadataProbe _probe;
    private readonly ILogger<AppRegistry> _logger;
    private readonly object _lock = new();

    private Dictionary<string, AppEntry> _apps = new(StringComparer.OrdinalIgnoreCase);

    public AppRegistry(IEnumerable<IAppDiscovery> discoveries, AppMetadataProbe probe, ILogger<AppRegistry> logger)
    {
        _discoveries = [.. discoveries];
        _probe = probe;
        _logger = logger;
    }

    public IReadOnlyList<DiscoveredApp> GetAll()
    {
        lock (_lock)
            return [.. _apps.Values.Select(static entry => entry.Metadata)];
    }

    public bool TryGet(string appId, out DiscoveredApp? app)
    {
        lock (_lock)
        {
            if (_apps.TryGetValue(appId, out var entry))
            {
                app = entry.Metadata;
                return true;
            }
        }

        app = null;
        return false;
    }

    public void Register(string appId, Uri baseUri, string description, TimeSpan gracePeriod)
    {
        var now = DateTimeOffset.UtcNow;
        baseUri = AppEndpointUri.Canonicalize(baseUri);
        var app = new DiscoveredApp(appId, baseUri, "studioctl", null, description, now);
        lock (_lock)
            _apps[appId] = new AppEntry(app, now + gracePeriod);

        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("Registered app {AppId} on {BaseUri} via studioctl", appId, baseUri);
    }

    public void Unregister(string appId, Uri baseUri)
    {
        DiscoveredApp? removed = null;
        lock (_lock)
        {
            if (_apps.TryGetValue(appId, out var entry) && AppEndpointUri.Same(entry.Metadata.BaseUri, baseUri))
            {
                _apps.Remove(appId);
                removed = entry.Metadata;
            }
        }

        if (removed is not null && _logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("Unregistered app {AppId} from {BaseUri}", removed.AppId, removed.BaseUri);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Refresh(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "App discovery refresh failed");
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }
    }

    private async Task Refresh(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        Dictionary<string, AppEntry> previous;
        lock (_lock)
            previous = new(_apps, StringComparer.OrdinalIgnoreCase);

        var previousApps = VisibleApps(previous);
        var next = await DiscoverApps(now, previous, cancellationToken);
        await ProbePreviousApps(now, previous, next, cancellationToken);
        KeepAppsInGrace(now, previous, next);

        Dictionary<string, DiscoveredApp> apps;
        lock (_lock)
        {
            ReconcileConcurrentChanges(previous, _apps, next);
            _apps = next;
            apps = VisibleApps(next);
        }

        LogRefresh(previousApps, apps, next.Count);
    }

    private async Task<Dictionary<string, AppEntry>> DiscoverApps(
        DateTimeOffset now,
        IReadOnlyDictionary<string, AppEntry> previous,
        CancellationToken cancellationToken
    )
    {
        var apps = new Dictionary<string, AppEntry>(StringComparer.OrdinalIgnoreCase);

        foreach (var discovery in _discoveries)
        {
            var candidates = await discovery.Discover(cancellationToken);
            foreach (var candidate in candidates)
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
                    continue;

                var baseUri = AppEndpointUri.Canonicalize(candidate.BaseUri);
                apps[appId] = new AppEntry(
                    new DiscoveredApp(
                        appId,
                        baseUri,
                        candidate.Source,
                        candidate.ProcessId,
                        candidate.Description,
                        now
                    ),
                    PreviousGraceDeadline(previous, appId, now)
                );
            }
        }

        return apps;
    }

    private async Task ProbePreviousApps(
        DateTimeOffset now,
        IReadOnlyDictionary<string, AppEntry> previous,
        Dictionary<string, AppEntry> next,
        CancellationToken cancellationToken
    )
    {
        foreach (var (appId, entry) in previous)
        {
            if (next.ContainsKey(appId))
                continue;

            var resolvedAppId = await _probe.Probe(entry.Metadata.BaseUri, cancellationToken);
            if (string.Equals(resolvedAppId, appId, StringComparison.OrdinalIgnoreCase))
                next[appId] = entry with { Metadata = entry.Metadata with { LastSeen = now } };
        }
    }

    private static void KeepAppsInGrace(
        DateTimeOffset now,
        Dictionary<string, AppEntry> previous,
        Dictionary<string, AppEntry> next
    )
    {
        foreach (var (appId, entry) in previous)
        {
            if (!next.ContainsKey(appId) && now <= entry.GraceDeadline)
                next[appId] = entry;
        }
    }

    private static void ReconcileConcurrentChanges(
        IReadOnlyDictionary<string, AppEntry> previous,
        IReadOnlyDictionary<string, AppEntry> current,
        Dictionary<string, AppEntry> next
    )
    {
        foreach (var appId in previous.Keys)
            if (!current.ContainsKey(appId))
                next.Remove(appId);

        foreach (var (appId, entry) in current)
        {
            if (!previous.TryGetValue(appId, out var previousEntry) || NewerEntry(entry, previousEntry))
                next[appId] = entry;
        }
    }

    private static bool NewerEntry(AppEntry entry, AppEntry previousEntry) =>
        !AppEndpointUri.Same(entry.Metadata.BaseUri, previousEntry.Metadata.BaseUri)
        || entry.Metadata.LastSeen > previousEntry.Metadata.LastSeen
        || entry.GraceDeadline > previousEntry.GraceDeadline;

    private void LogRefresh(
        IReadOnlyDictionary<string, DiscoveredApp> previousApps,
        IReadOnlyDictionary<string, DiscoveredApp> apps,
        int appCount
    )
    {
        if (!_logger.IsEnabled(LogLevel.Information))
            return;

        foreach (var (appId, app) in apps)
        {
            if (!previousApps.TryGetValue(appId, out var previous))
            {
                _logger.LogInformation(
                    "Discovered app {AppId} on {BaseUri} via {Source}",
                    appId,
                    app.BaseUri,
                    app.Source
                );
                continue;
            }

            if (!AppEndpointUri.Same(previous.BaseUri, app.BaseUri))
                _logger.LogInformation(
                    "Updated app {AppId} from {PreviousBaseUri} to {BaseUri}",
                    appId,
                    previous.BaseUri,
                    app.BaseUri
                );
        }

        foreach (var (appId, previous) in previousApps)
            if (!apps.ContainsKey(appId))
                _logger.LogInformation("Removed app {AppId} from {BaseUri}", appId, previous.BaseUri);

        _logger.LogInformation("Discovery refresh completed with {AppCount} apps", appCount);
    }

    private static DateTimeOffset PreviousGraceDeadline(
        IReadOnlyDictionary<string, AppEntry> previous,
        string appId,
        DateTimeOffset fallback
    )
    {
        return previous.TryGetValue(appId, out var entry) ? entry.GraceDeadline : fallback;
    }

    private static Dictionary<string, DiscoveredApp> VisibleApps(Dictionary<string, AppEntry> entries) =>
        entries.ToDictionary(
            static pair => pair.Key,
            static pair => pair.Value.Metadata,
            StringComparer.OrdinalIgnoreCase
        );

    private sealed record AppEntry(DiscoveredApp Metadata, DateTimeOffset GraceDeadline);
}
