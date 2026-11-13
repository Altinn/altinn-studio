using System.Globalization;
using Altinn.Studio.Common.Domain;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Fleet;

/// <summary>Where a sync finds the service owners, their apps and the Studio installations.</summary>
/// <remarks>
/// The defaults are the real services. <see cref="FromConfiguration"/> reads overrides under the properties' names,
/// and a list of Studio installations there replaces the default one.
/// </remarks>
public sealed class FleetOptions
{
    /// <summary>The service owner registry, which says which environments each service owner has.</summary>
    public Uri ServiceOwnerRegistry { get; init; } = new("https://altinncdn.no/orgs/altinn-orgs.json");

    /// <summary>The host that serves a service owner's apps, by environment name.</summary>
    public IReadOnlyDictionary<string, HostTemplate> AppsHosts { get; init; } =
        new Dictionary<string, HostTemplate>
        {
            ["prod"] = HostTemplate.Parse("{org}.apps.altinn.no"),
            ["tt02"] = HostTemplate.Parse("{org}.apps.tt02.altinn.no"),
        };

    /// <summary>The apps host of the environments <see cref="AppsHosts"/> leaves out.</summary>
    public HostTemplate OtherAppsHost { get; init; } = HostTemplate.Parse("{org}.apps.{env}.altinn.cloud");

    /// <summary>The Studio installations, in the order a release is looked up in.</summary>
    public IReadOnlyList<StudioHost> StudioHosts { get; init; } =
    [
        new("prod", Host("altinn.studio")),
        new("staging", Host("staging.altinn.studio")),
        new("dev", Host("dev.altinn.studio")),
    ];

    /// <summary>The template for the host that serves a service owner's apps in an environment.</summary>
    public HostTemplate AppsHost(RuntimeEnvironment environment) =>
        AppsHosts.TryGetValue(environment.Name, out HostTemplate? host) ? host : OtherAppsHost;

    /// <summary>Reads options from a configuration section, with the defaults for what it leaves out.</summary>
    /// <exception cref="FleetException">A value is not valid.</exception>
    public static FleetOptions FromConfiguration(IConfiguration section)
    {
        var defaults = new FleetOptions();
        string? registry = section[nameof(ServiceOwnerRegistry)];
        Uri? registryUri = null;
        if (
            registry is not null
            && !(Uri.TryCreate(registry, UriKind.Absolute, out registryUri) && registryUri.Scheme is "https" or "http")
        )
        {
            throw Invalid(section, nameof(ServiceOwnerRegistry), "an absolute HTTP or HTTPS URL");
        }

        var appsHosts = new Dictionary<string, HostTemplate>(defaults.AppsHosts, StringComparer.Ordinal);
        foreach (IConfigurationSection host in section.GetSection(nameof(AppsHosts)).GetChildren())
        {
            string key = $"{nameof(AppsHosts)}:{host.Key}";
            if (!RuntimeEnvironment.TryParse(host.Key, out RuntimeEnvironment environment))
            {
                throw Invalid(section, key, "under an environment name");
            }

            appsHosts[environment.Name] = Template(section, key, host.Value);
        }

        HostTemplate otherAppsHost = section[nameof(OtherAppsHost)] is { } other
            ? Template(section, nameof(OtherAppsHost), other)
            : defaults.OtherAppsHost;

        var studioHosts = new List<StudioHost>();
        foreach (
            IConfigurationSection studio in section
                .GetSection(nameof(StudioHosts))
                .GetChildren()
                .OrderBy(s =>
                    int.TryParse(s.Key, NumberStyles.None, CultureInfo.InvariantCulture, out int i) ? i : int.MaxValue
                )
        )
        {
            string? name = studio[nameof(StudioHost.Name)];
            if (
                string.IsNullOrWhiteSpace(name)
                || !HostName.TryParse(studio[nameof(StudioHost.HostName)], out HostName? hostName)
            )
            {
                throw Invalid(section, $"{nameof(StudioHosts)}:{studio.Key}", "a Name and a HostName");
            }

            studioHosts.Add(new StudioHost(name, hostName));
        }

        return new FleetOptions
        {
            ServiceOwnerRegistry = registryUri ?? defaults.ServiceOwnerRegistry,
            AppsHosts = appsHosts,
            OtherAppsHost = otherAppsHost,
            StudioHosts = studioHosts.Count > 0 ? studioHosts : defaults.StudioHosts,
        };
    }

    private static HostName Host(string value) =>
        HostName.TryParse(value, out HostName? host) ? host : throw new ArgumentException(value, nameof(value));

    private static HostTemplate Template(IConfiguration section, string key, string? value) =>
        HostTemplate.TryParse(value, out HostTemplate? template)
            ? template
            : throw Invalid(section, key, "a host name with {org} in it");

    private static FleetException Invalid(IConfiguration section, string key, string expected)
    {
        string path = section is IConfigurationSection { Path.Length: > 0 } named ? $"{named.Path}:{key}" : key;
        return new FleetException($"The configuration value {path} must be {expected}.");
    }
}
