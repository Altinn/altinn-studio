using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet;

/// <summary>Where a sync finds the service owners, their apps and the Studio installations.</summary>
public sealed class FleetOptions
{
    /// <summary>The service owner registry, which says which environments each service owner has.</summary>
    public Uri ServiceOwnerRegistry { get; init; } = new("https://altinncdn.no/orgs/altinn-orgs.json");

    /// <summary>The Studio installations, in the order a release is looked up in.</summary>
    public IReadOnlyList<StudioHost> StudioHosts { get; init; } =
    [
        new("prod", Host("altinn.studio")),
        new("staging", Host("staging.altinn.studio")),
        new("dev", Host("dev.altinn.studio")),
    ];

    /// <summary>The host that serves a service owner's apps in an environment, or <c>null</c> when there is none.</summary>
    public static HostName? AppsHost(ServiceOwnerCode org, RuntimeEnvironment environment)
    {
        string name =
            environment.IsProduction ? $"{org.Value}.apps.altinn.no"
            : environment == RuntimeEnvironment.TT02 ? $"{org.Value}.apps.tt02.altinn.no"
            : $"{org.Value}.apps.{environment.Name}.altinn.cloud";
        return HostName.TryParse(name, out HostName? host) ? host : null;
    }

    private static HostName Host(string value) =>
        HostName.TryParse(value, out HostName? host) ? host : throw new ArgumentException(value, nameof(value));
}
