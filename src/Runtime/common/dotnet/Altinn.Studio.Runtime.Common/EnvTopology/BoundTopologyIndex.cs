#nullable enable

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyIndex
{
    private readonly BoundTopologyAppRoute[] _apps;
    private readonly Dictionary<string, BoundTopologyAppRoute> _appsById;
    private readonly Dictionary<string, BoundTopologyComponentRoute[]> _componentRoutes;
    private readonly Dictionary<HostPort, Uri> _hostHttpUpstreams;
    private readonly Dictionary<string, RouteGroup[]> _routeGroupsByHost;

    public BoundTopologyIndex(BoundTopologyConfig? config)
    {
        config ??= new BoundTopologyConfig { Version = 1, Routes = [] };

        var compiledRoutes = config.Routes.Select(CompileRoute).ToArray();
        var enabledRoutes = compiledRoutes.Where(static route => route.Route.Enabled).ToArray();
        _routeGroupsByHost = BuildRouteGroups(compiledRoutes);
        _hostHttpUpstreams = BuildHostHttpUpstreams(enabledRoutes);
        _componentRoutes = BuildComponentRoutes(enabledRoutes);
        var apps = BuildApps(enabledRoutes);
        _apps = apps.Routes;
        _appsById = apps.RoutesById;
    }

    public IReadOnlyList<BoundTopologyAppRoute> GetApps() => _apps;

    public IReadOnlyList<BoundTopologyComponentRoute> GetComponentRoutes(string component)
    {
        if (string.IsNullOrWhiteSpace(component))
        {
            return [];
        }

        return _componentRoutes.GetValueOrDefault(component) ?? [];
    }

    public BoundTopologyRequestMatch? MatchRequest(string? host, string? path)
    {
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        if (!_routeGroupsByHost.TryGetValue(host, out var routeGroups))
        {
            return null;
        }

        var routeGroup = routeGroups.FirstOrDefault(group => group.IsMatch(path));
        return routeGroup?.Next();
    }

    public Uri? ResolveHostHttpUpstream(string? host, int port)
    {
        if (string.IsNullOrWhiteSpace(host) || port <= 0)
        {
            return null;
        }

        return _hostHttpUpstreams.GetValueOrDefault(new HostPort(host, port));
    }

    public BoundTopologyAppRoute? TryGetApp(string? appId)
    {
        if (string.IsNullOrWhiteSpace(appId))
        {
            return null;
        }

        return _appsById.GetValueOrDefault(appId);
    }

    public BoundTopologyComponentRoute? TryGetComponentRoute(string component)
    {
        var routes = GetComponentRoutes(component);
        return routes.Count == 0 ? null : routes[0];
    }

    public BoundTopologyAppRoute? TryGetSingleApp()
    {
        return _apps.Length == 1 ? _apps[0] : null;
    }

    private static (BoundTopologyAppRoute[] Routes, Dictionary<string, BoundTopologyAppRoute> RoutesById) BuildApps(
        CompiledRoute[] routes
    )
    {
        var routesById = new Dictionary<string, BoundTopologyAppRoute>(StringComparer.OrdinalIgnoreCase);
        foreach (var route in routes)
        {
            if (
                !string.Equals(route.Route.Component, "app", StringComparison.Ordinal)
                || route.HttpDestinationUri is not { } httpDestinationUri
                || !string.Equals(httpDestinationUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                || GetMetadataValue(route.Route.Metadata, BoundTopologyMetadataKeys.AppId) is not { } appId
                || string.IsNullOrWhiteSpace(appId)
            )
            {
                continue;
            }

            routesById.TryAdd(appId, new BoundTopologyAppRoute(route.Route, httpDestinationUri, appId));
        }

        var appRoutes = routesById.Values.OrderBy(static route => route.AppId, StringComparer.OrdinalIgnoreCase).ToArray();
        return (appRoutes, routesById);
    }

    private static Dictionary<string, BoundTopologyComponentRoute[]> BuildComponentRoutes(CompiledRoute[] routes)
    {
        var componentRoutes = new Dictionary<string, List<BoundTopologyComponentRoute>>(StringComparer.Ordinal);
        foreach (var route in routes)
        {
            if (!componentRoutes.TryGetValue(route.Route.Component, out var entries))
            {
                entries = [];
                componentRoutes.Add(route.Route.Component, entries);
            }

            entries.Add(new BoundTopologyComponentRoute(route.Route, route.HttpDestinationUri));
        }

        return componentRoutes.ToDictionary(
            static entry => entry.Key,
            static entry => entry.Value.ToArray(),
            StringComparer.Ordinal
        );
    }

    private static Dictionary<string, RouteGroup[]> BuildRouteGroups(IEnumerable<CompiledRoute> routes)
    {
        return routes.GroupBy(static route => route.Host, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                static hostGroup => hostGroup.Key,
                static hostGroup => hostGroup.GroupBy(static route => route.GroupKey, StringComparer.Ordinal)
                    .Select(static routeGroup => new RouteGroup([.. routeGroup]))
                    .OrderBy(static group => group.IsHostOnly)
                    .ThenByDescending(static group => group.PathPrefixLength)
                    .ThenBy(static group => group.GroupKey, StringComparer.Ordinal)
                    .ToArray(),
                StringComparer.OrdinalIgnoreCase
            );
    }

    private static CompiledRoute CompileRoute(BoundTopologyRoute route)
    {
        var httpDestinationUri =
            string.Equals(route.Destination.Kind, "http", StringComparison.OrdinalIgnoreCase)
            && Uri.TryCreate(route.Destination.Url, UriKind.Absolute, out var uri)
                ? uri
                : null;

        if (!string.IsNullOrEmpty(route.Match.PathPrefix))
        {
            return new PrefixRoute(
                route,
                route.Match.Host,
                route.Match.PathPrefix,
                "prefix:" + route.Match.Host + "\n" + route.Match.PathPrefix,
                httpDestinationUri
            );
        }

        return new HostRoute(route, route.Match.Host, "host:" + route.Match.Host, httpDestinationUri);
    }

    private static string? GetMetadataValue(IReadOnlyList<BoundTopologyMetadataEntry> metadata, string key)
    {
        return metadata.FirstOrDefault(entry => string.Equals(entry.Key, key, StringComparison.Ordinal))?.Value;
    }

    private static Dictionary<HostPort, Uri> BuildHostHttpUpstreams(IEnumerable<CompiledRoute> routes)
    {
        var upstreams = new Dictionary<HostPort, Uri>();
        foreach (var route in routes)
        {
            if (
                !string.Equals(route.Route.Destination.Location, "host", StringComparison.OrdinalIgnoreCase)
                || route.HttpDestinationUri is not { } uri
                || !string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }

            upstreams[new HostPort(uri.Host, uri.Port)] = uri;
        }

        return upstreams;
    }

    private readonly record struct HostPort(string Host, int Port)
    {
        public string Host { get; } = Host.Trim().ToLowerInvariant();

        public int Port { get; } = Port;
    }

    private sealed class RouteGroup(CompiledRoute[] routes)
    {
        private int _next = -1;

        public string GroupKey { get; } = routes[0].GroupKey;

        public bool IsHostOnly { get; } = routes[0].IsHostOnly;

        public int PathPrefixLength { get; } = routes[0].PathPrefixLength;

        public bool IsMatch(string path) => routes.Length > 0 && routes[0].IsMatch(path);

        public BoundTopologyRequestMatch Next()
        {
            if (routes.Length == 1)
            {
                return routes[0].Match();
            }

            var index = (int)((uint)Interlocked.Increment(ref _next) % (uint)routes.Length);
            return routes[index].Match();
        }
    }

    private abstract class CompiledRoute(
        BoundTopologyRoute route,
        string host,
        string groupKey,
        Uri? httpDestinationUri
    )
    {
        public BoundTopologyRoute Route { get; } = route;

        public string Host { get; } = host;

        public string GroupKey { get; } = groupKey;

        public Uri? HttpDestinationUri { get; } = httpDestinationUri;

        public virtual bool IsHostOnly => false;

        public virtual int PathPrefixLength => 0;

        public abstract bool IsMatch(string path);

        public BoundTopologyRequestMatch Match() => new(Route, HttpDestinationUri);
    }

    private sealed class HostRoute(
        BoundTopologyRoute route,
        string host,
        string groupKey,
        Uri? httpDestinationUri
    ) : CompiledRoute(route, host, groupKey, httpDestinationUri)
    {
        public override bool IsHostOnly => true;

        public override bool IsMatch(string path) => true;
    }

    private sealed class PrefixRoute(
        BoundTopologyRoute route,
        string host,
        string prefix,
        string groupKey,
        Uri? httpDestinationUri
    ) : CompiledRoute(route, host, groupKey, httpDestinationUri)
    {
        public override int PathPrefixLength => prefix.Length;

        public override bool IsMatch(string path)
        {
            if (prefix == "/")
            {
                return true;
            }

            if (string.Equals(path, prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (prefix.EndsWith('/'))
            {
                return path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
            }

            return path.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase);
        }
    }
}

public sealed class BoundTopologyComponentRoute(BoundTopologyRoute route, Uri? httpDestinationUri)
{
    public BoundTopologyRoute Route { get; } = route;

    public Uri? HttpDestinationUri { get; } = httpDestinationUri;

    public string PublicHost => Route.Match.Host;

    public string PublicPathPrefix => Route.Match.PathPrefix;
}

public sealed class BoundTopologyAppRoute(BoundTopologyRoute route, Uri httpDestinationUri, string appId)
{
    public BoundTopologyRoute Route { get; } = route;

    public string AppId { get; } = appId;

    public Uri HttpDestinationUri { get; } = httpDestinationUri;

    public string PublicHost => Route.Match.Host;

    public string PublicPathPrefix => Route.Match.PathPrefix;

    public string TargetHost => HttpDestinationUri.Host;

    public int TargetPort => HttpDestinationUri.Port;
}

public sealed class BoundTopologyRequestMatch(BoundTopologyRoute route, Uri? httpDestinationUri)
{
    public BoundTopologyRoute Route { get; } = route;

    public Uri? HttpDestinationUri { get; } = httpDestinationUri;
}
