namespace Altinn.Studio.AppManager.Discovery;

internal sealed class AppRegistry : BackgroundService
{
    private static readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);

    private readonly IReadOnlyList<IAppDiscovery> _discoveries;
    private readonly AppMetadataProbe _probe;
    private readonly ILogger<AppRegistry> _logger;

    private Dictionary<string, DiscoveredApp> _apps = new(StringComparer.OrdinalIgnoreCase);

    public AppRegistry(IEnumerable<IAppDiscovery> discoveries, AppMetadataProbe probe, ILogger<AppRegistry> logger)
    {
        _discoveries = [.. discoveries];
        _probe = probe;
        _logger = logger;
    }

    public IReadOnlyList<DiscoveredApp> GetAll() => [.. _apps.Values];

    public bool TryGet(string appId, out DiscoveredApp? app)
    {
        if (_apps.TryGetValue(appId, out var resolved))
        {
            app = resolved;
            return true;
        }

        app = null;
        return false;
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
        var previousApps = _apps;
        var previousCandidates = previousApps.Values.ToDictionary(
            static app => new CandidateKey(app.Source, app.BaseUri, app.ProcessId),
            static app => app,
            CandidateKey.Comparer
        );
        var apps = new Dictionary<string, DiscoveredApp>(StringComparer.OrdinalIgnoreCase);
        var candidateCount = 0;

        foreach (var discovery in _discoveries)
        {
            var candidates = await discovery.Discover(cancellationToken);
            candidateCount += candidates.Count;
            foreach (var candidate in candidates)
            {
                var candidateKey = new CandidateKey(candidate.Source, candidate.BaseUri, candidate.ProcessId);
                if (previousCandidates.TryGetValue(candidateKey, out var previous))
                {
                    apps[previous.AppId] = previous with { LastSeen = now };
                    continue;
                }

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

                apps[appId] = new DiscoveredApp(
                    appId,
                    candidate.BaseUri,
                    candidate.Source,
                    candidate.ProcessId,
                    candidate.Description,
                    now
                );
            }
        }

        _apps = apps;
        if (_logger.IsEnabled(LogLevel.Information))
        {
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

                if (previous.BaseUri != app.BaseUri)
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

            _logger.LogInformation(
                "Discovery refresh completed with {CandidateCount} candidates and {AppCount} apps",
                candidateCount,
                apps.Count
            );
        }
    }

    private readonly record struct CandidateKey(string Source, Uri BaseUri, int? ProcessId)
    {
        public static IEqualityComparer<CandidateKey> Comparer { get; } = new CandidateKeyComparer();

        private sealed class CandidateKeyComparer : IEqualityComparer<CandidateKey>
        {
            public bool Equals(CandidateKey x, CandidateKey y) =>
                string.Equals(x.Source, y.Source, StringComparison.OrdinalIgnoreCase)
                && Uri.Compare(
                    x.BaseUri,
                    y.BaseUri,
                    UriComponents.AbsoluteUri,
                    UriFormat.SafeUnescaped,
                    StringComparison.OrdinalIgnoreCase
                ) == 0
                && x.ProcessId == y.ProcessId;

            public int GetHashCode(CandidateKey obj)
            {
                var hash = new HashCode();
                hash.Add(obj.Source, StringComparer.OrdinalIgnoreCase);
                hash.Add(obj.BaseUri.AbsoluteUri, StringComparer.OrdinalIgnoreCase);
                hash.Add(obj.ProcessId);
                return hash.ToHashCode();
            }
        }
    }
}
