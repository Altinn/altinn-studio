using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Studio.Common.Cdn;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>What the service owners' clusters in an environment say they run.</summary>
/// <param name="Orgs">The service owners the sync covers, by name, whether their discovery worked or not.</param>
/// <param name="Deployments">The apps the service owners whose discovery worked run.</param>
/// <param name="Failures">The service owners whose discovery failed, and why. Their apps are kept as they are.</param>
/// <param name="Notes">Entries that were left out because they are not apps or versions.</param>
/// <param name="Unreadable">Apps a cluster lists with a version that cannot be read. Their copies are kept as they are.</param>
internal sealed record DiscoveryResult(
    IReadOnlySet<ServiceOwnerCode> Orgs,
    IReadOnlyList<AppDeployment> Deployments,
    IReadOnlyList<OrgFailure> Failures,
    IReadOnlyList<string> Notes,
    IReadOnlySet<AppIdentifier> Unreadable
);

/// <summary>Finds which service owners have an environment, and which apps each of them runs there.</summary>
internal sealed class Discovery(HttpClient http, FleetOptions options, int parallelism)
{
    private const string KubernetesWrapperRelease = "kuberneteswrapper";

    /// <summary>Downloads the service owner registry.</summary>
    /// <exception cref="FleetException">The registry cannot be read.</exception>
    public async Task<AltinnOrgsRegistry> GetServiceOwners(CancellationToken cancellationToken)
    {
        const string What = "the service owners";
        byte[] document = await Download(options.ServiceOwnerRegistry, What, cancellationToken);
        if (!AltinnOrgsRegistry.TryParse(document, out AltinnOrgsRegistry? registry))
        {
            throw NotTheRegistry(options.ServiceOwnerRegistry, What);
        }

        return registry.ServiceOwners.Count > 0
            ? registry
            : throw new FleetException($"{options.ServiceOwnerRegistry} lists no service owners.");
    }

    /// <summary>Downloads the environment registry, which says where each environment serves apps.</summary>
    /// <exception cref="FleetException">The registry cannot be read.</exception>
    public async Task<AltinnEnvironmentsRegistry> GetEnvironments(CancellationToken cancellationToken)
    {
        const string What = "the environments";
        byte[] document = await Download(options.EnvironmentRegistry, What, cancellationToken);
        if (
            !AltinnEnvironmentsRegistry.TryParse(
                document,
                options.AppsHostPattern,
                out AltinnEnvironmentsRegistry? registry
            )
        )
        {
            throw NotTheRegistry(options.EnvironmentRegistry, What);
        }

        return registry.Environments.Count > 0
            ? registry
            : throw new FleetException($"{options.EnvironmentRegistry} lists no environments.");
    }

    /// <summary>Asks each service owner that has the environment which apps it runs there.</summary>
    /// <param name="environment">The environment.</param>
    /// <param name="registry">The service owner registry.</param>
    /// <param name="environments">The environment registry.</param>
    /// <param name="orgFilter">The service owners to cover, or <c>null</c> for all.</param>
    /// <param name="onProgress">Called with the number of service owners done and the total.</param>
    /// <param name="cancellationToken">Cancels the discovery.</param>
    public async Task<DiscoveryResult> Discover(
        RuntimeEnvironment environment,
        AltinnOrgsRegistry registry,
        AltinnEnvironmentsRegistry environments,
        IReadOnlySet<ServiceOwnerCode>? orgFilter,
        Action<int, int> onProgress,
        CancellationToken cancellationToken
    )
    {
        ServiceOwnerCode[] covered =
        [
            .. registry
                .ServiceOwners.Where(owner =>
                    (orgFilter is null || orgFilter.Contains(owner.Code)) && owner.Has(environment)
                )
                .Select(owner => owner.Code)
                .OrderBy(code => code.Value, StringComparer.Ordinal),
        ];
        var outcomes = new OrgOutcome[covered.Length];
        int done = 0;
        onProgress(0, covered.Length);
        await Parallel.ForAsync(
            0,
            covered.Length,
            new ParallelOptions { MaxDegreeOfParallelism = parallelism, CancellationToken = cancellationToken },
            async (index, token) =>
            {
                outcomes[index] = await DiscoverOrg(environment, environments, covered[index], token);
                onProgress(Interlocked.Increment(ref done), covered.Length);
            }
        );

        return new DiscoveryResult(
            new HashSet<ServiceOwnerCode>(covered),
            [.. outcomes.OfType<OrgOutcome.Listed>().SelectMany(o => o.Deployments)],
            [.. outcomes.OfType<OrgOutcome.Failed>().Select(o => o.Failure)],
            [
                .. registry.Skipped.Select(name =>
                    $"The service owner registry lists '{name}', which is not a service owner code."
                ),
                .. registry.UnknownEnvironments.Select(unknown =>
                    $"The service owner registry lists the environment '{unknown.Name}' for {unknown.Code}, which is not an environment."
                ),
                .. environments.Skipped.Select(name =>
                    $"The environment registry lists '{name}', which is not an environment with a host name and an "
                    + "app prefix."
                ),
                .. outcomes.OfType<OrgOutcome.Listed>().SelectMany(o => o.Notes),
            ],
            outcomes.OfType<OrgOutcome.Listed>().SelectMany(o => o.Unreadable).ToHashSet()
        );
    }

    private async Task<byte[]> Download(Uri url, string what, CancellationToken cancellationToken)
    {
        try
        {
            using HttpResponseMessage response = await http.GetAsync(
                url,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );
            if (!response.IsSuccessStatusCode)
            {
                throw new FleetException($"Could not read {what} from {url}: {(int)response.StatusCode}.");
            }

            return await response.Content.ReadAsByteArrayAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or IOException)
        {
            throw new FleetException($"Could not read {what} from {url}: {ex.Message}", ex);
        }
    }

    private static FleetException NotTheRegistry(Uri url, string what) =>
        new($"Could not read {what} from {url}: it is not the registry.");

    private abstract record OrgOutcome
    {
        public sealed record Listed(List<AppDeployment> Deployments, List<AppIdentifier> Unreadable, List<string> Notes)
            : OrgOutcome;

        public sealed record Failed(OrgFailure Failure) : OrgOutcome;
    }

    private async Task<OrgOutcome> DiscoverOrg(
        RuntimeEnvironment environment,
        AltinnEnvironmentsRegistry environments,
        ServiceOwnerCode org,
        CancellationToken cancellationToken
    )
    {
        // A service owner whose apps' host is not known keeps its apps, as one whose cluster does not answer does.
        if (!environments.TryGetAppsHost(org, environment, out string? name))
        {
            return new OrgOutcome.Failed(
                new OrgFailure(org.Value, $"the environment registry does not list {environment.RegistryName}")
            );
        }

        if (!HostName.TryParse(name, out HostName? host))
        {
            return new OrgOutcome.Failed(new OrgFailure(org.Value, $"its apps' host, {name}, is not a host name"));
        }

        string url = $"https://{host}/kuberneteswrapper/api/v1/deployments";
        List<KubernetesDeployment>? listed;
        try
        {
            using HttpResponseMessage response = await http.GetAsync(
                url,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );
            if (!response.IsSuccessStatusCode)
            {
                return new OrgOutcome.Failed(new OrgFailure(org.Value, $"{url} answered {(int)response.StatusCode}"));
            }

            listed = await response.Content.ReadFromJsonAsync(
                FleetJsonContext.Default.ListKubernetesDeployment,
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or IOException)
        {
            return new OrgOutcome.Failed(new OrgFailure(org.Value, $"{url}: {FleetException.Describe(ex)}"));
        }

        if (listed is null || listed.Exists(d => d is null))
        {
            return new OrgOutcome.Failed(new OrgFailure(org.Value, $"{url} answered with an empty entry"));
        }

        // kuberneteswrapper lists itself, so a list without it did not come from a working cluster.
        if (!listed.Exists(d => d.Release == KubernetesWrapperRelease))
        {
            return new OrgOutcome.Failed(new OrgFailure(org.Value, $"{url} did not list kuberneteswrapper itself"));
        }

        var deployments = new List<AppDeployment>(listed.Count);
        var unreadable = new List<AppIdentifier>();
        var notes = new List<string>();
        var seen = new HashSet<AppIdentifier>();
        foreach (KubernetesDeployment deployment in listed)
        {
            if (deployment.Release == KubernetesWrapperRelease)
            {
                continue;
            }

            if (!TryParseHelmRelease(org, deployment.Release, out AppIdentifier app))
            {
                notes.Add($"{url} lists {deployment.Release} {deployment.Version}, which is not an app and a version.");
            }
            else if (!AppVersion.TryParse(deployment.Version?.Trim(), out AppVersion version))
            {
                // The app still runs, so its copy is kept rather than removed.
                unreadable.Add(app);
                notes.Add(
                    $"{url} lists {app} at '{deployment.Version}', which is not a version, so its copy was kept."
                );
            }
            else if (seen.Add(app))
            {
                deployments.Add(new AppDeployment(app, environment, version));
            }
        }

        return new OrgOutcome.Listed(deployments, unreadable, notes);
    }

    /// <summary>
    /// Reads the app from the <c>release</c> kuberneteswrapper lists for a deployment, which is the name of the app's
    /// Helm release: <c>{org}-{app}</c> in lower case.
    /// </summary>
    internal static bool TryParseHelmRelease(ServiceOwnerCode org, string? release, out AppIdentifier app)
    {
        app = default;
        string prefix = org.Value;
        if (
            release is null
            || release.Length <= prefix.Length + 1
            || !release.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            || release[prefix.Length] != '-'
            || !AppName.TryParse(release[(prefix.Length + 1)..], out AppName name)
        )
        {
            return false;
        }

        app = new AppIdentifier(org, name);
        return true;
    }
}
