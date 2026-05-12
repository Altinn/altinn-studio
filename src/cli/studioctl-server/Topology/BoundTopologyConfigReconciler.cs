using System.Globalization;
using System.Text.Json;
using System.Threading.Channels;
using Altinn.Studio.EnvTopology;
using Altinn.Studio.StudioctlServer.Discovery;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.StudioctlServer.Topology;

internal sealed class BoundTopologyConfigReconciler : BackgroundService
{
    private const string AppComponent = "app";

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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bound topology config poll loop failed");
            }
        }
    }

    private bool IsEnabled =>
        !string.IsNullOrWhiteSpace(_options.BaseConfigPath) && !string.IsNullOrWhiteSpace(_options.ConfigPath);

    private async Task RunPollLoop(ChannelWriter<RefreshReason> refreshRequests, CancellationToken stoppingToken)
    {
        if (_options.PollInterval <= TimeSpan.Zero)
        {
            _logger.LogWarning(
                "Bound topology config poll loop disabled because PollInterval is not positive: {PollInterval}",
                _options.PollInterval
            );
            return;
        }

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

            var boundConfig = Merge(_baseTopologyConfig.Get(BoundTopologyOptions.BaseName), _appRegistry.GetAll());
            var payload = JsonSerializer.SerializeToUtf8Bytes(boundConfig, _jsonOptions);
            if (_lastAppliedPayload is not null && payload.AsSpan().SequenceEqual(_lastAppliedPayload))
            {
                return;
            }

            await WriteBoundConfig(payload, cancellationToken);
            _lastAppliedPayload = payload;

            if (_logger.IsEnabled(LogLevel.Information))
            {
                _logger.LogInformation(
                    "Applied bound topology config version {Version} with {RouteCount} routes to {Path}",
                    boundConfig.Version,
                    boundConfig.Routes.Count,
                    _options.ConfigPath
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
                "Failed to refresh bound topology config from {BaseConfigPath} to {ConfigPath}",
                _options.BaseConfigPath,
                _options.ConfigPath
            );
        }
    }

    private async Task WriteBoundConfig(byte[] payload, CancellationToken cancellationToken)
    {
        var path = _options.ConfigPath ?? throw new InvalidOperationException("bound topology config path is required");
        var directory = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException("bound topology config path must have a parent directory");
        }

        Directory.CreateDirectory(directory);
        var tempPath = path + ".tmp";
        await File.WriteAllBytesAsync(tempPath, [.. payload, (byte)'\n'], cancellationToken);
        try
        {
            File.Move(tempPath, path, overwrite: true);
        }
        catch
        {
            DeleteTempFile(tempPath);
            throw;
        }
    }

    private void DeleteTempFile(string path)
    {
        try
        {
            File.Delete(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Failed to remove bound topology temp file {Path}", path);
        }
    }

    private BoundTopologyConfig Merge(BoundTopologyConfig baseConfig, IReadOnlyList<DiscoveredApp> apps)
    {
        var routes = new List<BoundTopologyRoute>(baseConfig.Routes);
        var template = baseConfig.AppRouteTemplate;
        if (!string.IsNullOrWhiteSpace(template.Host) && !string.IsNullOrWhiteSpace(template.PathPrefixTemplate))
        {
            foreach (var app in SelectResolvedApps(apps))
            {
                if (TryExpandAppRoute(template, app, out var route))
                {
                    routes.Add(route);
                    continue;
                }

                _logger.LogWarning("Skipping discovered app with invalid app id {AppId}", app.AppId);
            }
        }

        return new BoundTopologyConfig
        {
            AppRouteTemplate = template,
            Version = baseConfig.Version,
            Routes = routes,
        };
    }

    private static IEnumerable<DiscoveredApp> SelectResolvedApps(IReadOnlyList<DiscoveredApp> apps)
    {
        return apps.OrderBy(static app => app.AppId, StringComparer.OrdinalIgnoreCase)
            .ThenBy(static app => app.BaseUri.ToString(), StringComparer.OrdinalIgnoreCase);
    }

    private static bool TryExpandAppRoute(
        BoundTopologyAppRouteTemplate template,
        DiscoveredApp app,
        out BoundTopologyRoute route
    )
    {
        route = new BoundTopologyRoute();
        if (!TryExpandAppPathPrefix(template.PathPrefixTemplate, app.AppId, out var pathPrefix))
        {
            return false;
        }

        route = new BoundTopologyRoute
        {
            Component = AppComponent,
            Enabled = true,
            Destination = new BoundTopologyDestination
            {
                Kind = "http",
                Location = "host",
                Url = app.BaseUri.ToString(),
            },
            Match = new BoundTopologyRouteMatch { Host = template.Host, PathPrefix = pathPrefix },
            Metadata = BuildMetadata(app),
        };
        return true;
    }

    private static bool TryExpandAppPathPrefix(string pathPrefixTemplate, string appId, out string pathPrefix)
    {
        const char urlPathSeparator = '/';

        pathPrefix = string.Empty;
        var parts = appId.Trim(urlPathSeparator).Split(urlPathSeparator, 2);
        if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]) || string.IsNullOrWhiteSpace(parts[1]))
        {
            return false;
        }

        pathPrefix = pathPrefixTemplate
            .Replace("{org}", parts[0], StringComparison.Ordinal)
            .Replace("{app}", parts[1], StringComparison.Ordinal);
        return true;
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
