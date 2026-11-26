using Altinn.Studio.Common.Cdn;

namespace Altinn.Studio.Fleet;

/// <summary>Where a sync finds the service owners, their apps and the Studio installations.</summary>
public sealed class FleetOptions
{
    /// <summary>The service owner registry, which says which environments each service owner has.</summary>
    public Uri ServiceOwnerRegistry { get; init; } = new("https://altinncdn.no/orgs/altinn-orgs.json");

    /// <summary>The environment registry, which says where each environment serves the service owners' apps.</summary>
    public Uri EnvironmentRegistry { get; init; } = new("https://altinncdn.no/config/environments.json");

    /// <summary>
    /// How the host that serves a service owner's apps is made from the environment registry. See
    /// <see cref="AltinnEnvironmentsRegistry.DefaultAppsHostPattern"/>.
    /// </summary>
    public string AppsHostPattern { get; init; } = AltinnEnvironmentsRegistry.DefaultAppsHostPattern;

    /// <summary>The Studio installations, in the order a release is looked up in.</summary>
    public IReadOnlyList<StudioHost> StudioHosts { get; init; } =
    [
        new("prod", Host("altinn.studio")),
        new("staging", Host("staging.altinn.studio")),
        new("dev", Host("dev.altinn.studio")),
    ];

    private static HostName Host(string value) =>
        HostName.TryParse(value, out HostName? host) ? host : throw new ArgumentException(value, nameof(value));
}
