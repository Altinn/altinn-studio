using System.Globalization;
using System.Text.Json;
using System.Threading.Channels;
using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.EnvTopology;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class BoundTopologyConfigReconciler : BackgroundService
{
    private const string AppComponent = "app";
    private const char URLPathSeparator = '/';

    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly BoundTopologyOptions _options;
    private readonly IOptionsMonitor<BoundTopologyConfig> _baseTopologyConfig;
    private readonly AppRegistry _appRegistry;
    private readonly ILogger<BoundTopologyConfigReconciler> _logger;

    private byte[]? _lastAppliedPayload;

    public BoundTopologyConfigReconciler(
        BoundTopologyOptions options,
        IOptionsMonitor<BoundTopologyConfig> baseTopologyConfig,
        AppRegistry appRegistry,
        ILogger<BoundTopologyConfigReconciler> logger
    )
    {
        _options = options;
        _baseTopologyConfig = baseTopologyConfig;
        _appRegistry = appRegistry;
        _logger = logger;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        if (IsEnabled)
        {
            await Refresh(cancellationToken);
        }

        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!IsEnabled)
        {
            _logger.LogInformation("Bound topology config disabled");
            return;
        }

        var refreshRequests = Channel.CreateUnbounded<RefreshReason>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false }
        );

        using var baseConfigSubscription = _baseTopologyConfig.OnChange(
            (_, name) =>
            {
                if (name == BoundTopologyOptions.BaseName)
                {
                    refreshRequests.Writer.TryWrite(RefreshReason.BaseChanged);
                }
            }
        );
        using var appRegistrySubscription = _appRegistry.OnChanged(() =>
        {
            refreshRequests.Writer.TryWrite(RefreshReason.AppsChanged);
        });

        var pollTask = Task.Run(() => RunPollLoop(refreshRequests.Writer, stoppingToken), stoppingToken);
        try
        {
            while (await refreshRequests.Reader.WaitToReadAsync(stoppingToken))
            {
                while (refreshRequests.Reader.TryRead(out var reason))
                {
                    _ = reason;
                    DrainRefreshRequests(refreshRequests.Reader);
                    await Refresh(stoppingToken);
                }
            }
        }
        finally
        {
            try
            {
                await pollTask;
            }
            catch (OperationCanceledException ex) when (stoppingToken.IsCancellationRequested)
            {
                _logger.LogDebug(ex, "Bound topology config poll loop cancelled");
            }
        }
    }

    private bool IsEnabled =>
        !string.IsNullOrWhiteSpace(_options.BasePath) && !string.IsNullOrWhiteSpace(_options.MergedPath);

    private async Task RunPollLoop(ChannelWriter<RefreshReason> refreshRequests, CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_options.PollInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await refreshRequests.WriteAsync(RefreshReason.Poll, stoppingToken);
        }
    }

    private static void DrainRefreshRequests(ChannelReader<RefreshReason> refreshRequests)
    {
        while (refreshRequests.TryRead(out var ignored))
        {
            _ = ignored;
        }
    }

    private async Task Refresh(CancellationToken cancellationToken)
    {
        try
        {
            if (!IsEnabled)
            {
                return;
            }

            var mergedConfig = Merge(_baseTopologyConfig.Get(BoundTopologyOptions.BaseName), _appRegistry.GetAll());
            var payload = JsonSerializer.SerializeToUtf8Bytes(mergedConfig, _jsonOptions);
            if (_lastAppliedPayload is not null && payload.AsSpan().SequenceEqual(_lastAppliedPayload))
            {
                return;
            }

            await WriteMergedConfig(payload, cancellationToken);
            _lastAppliedPayload = payload;

            if (_logger.IsEnabled(LogLevel.Information))
            {
                _logger.LogInformation(
                    "Applied bound topology config version {Version} with {RouteCount} routes to {Path}",
                    mergedConfig.Version,
                    mergedConfig.Routes.Count,
                    _options.MergedPath
                );
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to refresh bound topology config from {BasePath} to {MergedPath}",
                _options.BasePath,
                _options.MergedPath
            );
        }
    }

    private async Task WriteMergedConfig(byte[] payload, CancellationToken cancellationToken)
    {
        var path = _options.MergedPath ?? throw new InvalidOperationException("bound topology merged path is required");
        var directory = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException("bound topology merged path must have a parent directory");
        }

        Directory.CreateDirectory(directory);
        var tempPath = path + ".tmp";
        await File.WriteAllBytesAsync(tempPath, [.. payload, (byte)'\n'], cancellationToken);
        File.Move(tempPath, path, overwrite: true);
    }

    private static BoundTopologyConfig Merge(BoundTopologyConfig baseConfig, IReadOnlyList<DiscoveredApp> apps)
    {
        var routes = new List<BoundTopologyRoute>(baseConfig.Routes.Count + apps.Count);
        List<BoundTopologyRoute>? appTemplates = null;
        foreach (var route in baseConfig.Routes)
        {
            if (string.Equals(route.Component, AppComponent, StringComparison.OrdinalIgnoreCase))
            {
                appTemplates ??= [];
                appTemplates.Add(route);
                continue;
            }

            routes.Add(route);
        }

        if (appTemplates is null || appTemplates.Count == 0)
        {
            return new BoundTopologyConfig { Version = baseConfig.Version, Routes = routes };
        }

        foreach (var template in appTemplates)
        {
            foreach (var app in SelectResolvedApps(apps))
            {
                routes.Add(ExpandAppRoute(template, app));
            }
        }

        return new BoundTopologyConfig { Version = baseConfig.Version, Routes = routes };
    }

    private static IEnumerable<DiscoveredApp> SelectResolvedApps(IReadOnlyList<DiscoveredApp> apps)
    {
        return apps.OrderBy(static app => app.AppId, StringComparer.OrdinalIgnoreCase)
            .ThenBy(static app => app.BaseUri.ToString(), StringComparer.OrdinalIgnoreCase);
    }

    private static BoundTopologyRoute ExpandAppRoute(BoundTopologyRoute template, DiscoveredApp app)
    {
        return new BoundTopologyRoute
        {
            Component = template.Component,
            Enabled = template.Enabled,
            Destination = new BoundTopologyDestination
            {
                Kind = "http",
                Location = "host",
                Url = app.BaseUri.ToString(),
            },
            Match = new BoundTopologyRouteMatch
            {
                Host = template.Match.Host,
                PathPrefix = URLPathSeparator + app.AppId.Trim(URLPathSeparator),
                PathPattern = "",
            },
            Metadata = BuildMetadata(app),
        };
    }

    private static List<BoundTopologyMetadataEntry> BuildMetadata(DiscoveredApp app)
    {
        var metadata = new List<BoundTopologyMetadataEntry>
        {
            Entry(BoundTopologyMetadataKeys.AppId, app.AppId),
            Entry(BoundTopologyMetadataKeys.Description, app.Description),
            Entry(BoundTopologyMetadataKeys.Source, app.Source),
        };

        if (app.ProcessId is { } processId)
        {
            metadata.Add(Entry(BoundTopologyMetadataKeys.ProcessId, processId.ToString(CultureInfo.InvariantCulture)));
        }
        if (app.HostPort is { } hostPort)
        {
            metadata.Add(Entry(BoundTopologyMetadataKeys.HostPort, hostPort.ToString(CultureInfo.InvariantCulture)));
        }
        if (!string.IsNullOrWhiteSpace(app.ContainerId))
        {
            metadata.Add(Entry(BoundTopologyMetadataKeys.ContainerId, app.ContainerId));
        }
        if (!string.IsNullOrWhiteSpace(app.Name))
        {
            metadata.Add(Entry(BoundTopologyMetadataKeys.Name, app.Name));
        }

        return metadata;
    }

    private static BoundTopologyMetadataEntry Entry(string key, string value)
    {
        return new BoundTopologyMetadataEntry { Key = key, Value = value };
    }

    private enum RefreshReason
    {
        BaseChanged,
        AppsChanged,
        Poll,
    }
}
