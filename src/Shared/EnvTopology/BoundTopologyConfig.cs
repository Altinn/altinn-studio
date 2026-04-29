#nullable enable

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyConfig
{
    public BoundTopologyAppRouteTemplate AppRouteTemplate { get; set; } = new();

    public List<BoundTopologyRoute> Routes { get; set; } = [];

    public int Version { get; set; }
}

public sealed class BoundTopologyAppRouteTemplate
{
    public string Host { get; set; } = string.Empty;

    public string PathPrefixTemplate { get; set; } = string.Empty;
}

public sealed class BoundTopologyRoute
{
    public string Component { get; set; } = string.Empty;

    public BoundTopologyDestination Destination { get; set; } = new();

    public bool Enabled { get; set; }

    public BoundTopologyRouteMatch Match { get; set; } = new();

    public List<BoundTopologyMetadataEntry> Metadata { get; set; } = [];
}

public sealed class BoundTopologyMetadataEntry
{
    public string Key { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}

public sealed class BoundTopologyRouteMatch
{
    public string Host { get; set; } = string.Empty;

    public string PathPrefix { get; set; } = string.Empty;
}

public sealed class BoundTopologyDestination
{
    public string Kind { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;
}
