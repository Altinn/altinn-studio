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
internal sealed record DiscoveryResult(
    IReadOnlySet<ServiceOwnerCode> Orgs,
    IReadOnlyList<AppDeployment> Deployments,
    IReadOnlyList<OrgFailure> Failures,
    IReadOnlyList<string> Notes
);

/// <summary>Finds which service owners have an environment, and which apps each of them runs there.</summary>
internal sealed class Discovery(HttpClient http, FleetOptions options, int parallelism)
{
    private const string KubernetesWrapperRelease = "kuberneteswrapper";

    /// <summary>Downloads the service owner registry.</summary>
    /// <exception cref="FleetException">The registry cannot be read.</exception>
    public async Task<AltinnOrgsRegistry> GetServiceOwners(CancellationToken cancellationToken)
    {
        byte[] document;
        try
        {
            using HttpResponseMessage response = await http.GetAsync(
                options.ServiceOwnerRegistry,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );
            if (!response.IsSuccessStatusCode)
            {
                throw new FleetException(
                    $"Could not read the service owners from {options.ServiceOwnerRegistry}: {(int)response.StatusCode}."
                );
            }

            document = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or IOException)
        {
            throw new FleetException(
                $"Could not read the service owners from {options.ServiceOwnerRegistry}: {ex.Message}",
                ex
            );
        }

        if (!AltinnOrgsRegistry.TryParse(document, out AltinnOrgsRegistry? registry))
        {
            throw new FleetException(
                $"Could not read the service owners from {options.ServiceOwnerRegistry}: it is not the registry."
            );
        }

        return registry.ServiceOwners.Count > 0
            ? registry
            : throw new FleetException($"{options.ServiceOwnerRegistry} lists no service owners.");
    }

    /// <summary>Asks each service owner that has the environment which apps it runs there.</summary>
    /// <param name="environment">The environment.</param>
    /// <param name="registry">The service owner registry.</param>
    /// <param name="orgFilter">The service owners to cover, or <c>null</c> for all.</param>
    /// <param name="onProgress">Called with the number of service owners done and the total.</param>
    /// <param name="cancellationToken">Cancels the discovery.</param>
    public async Task<DiscoveryResult> Discover(
        RuntimeEnvironment environment,
        AltinnOrgsRegistry registry,
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
                outcomes[index] = await DiscoverOrg(environment, covered[index], token);
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
                .. outcomes.OfType<OrgOutcome.Listed>().SelectMany(o => o.Notes),
            ]
        );
    }

    private abstract record OrgOutcome
    {
        public sealed record Listed(List<AppDeployment> Deployments, List<string> Notes) : OrgOutcome;

        public sealed record Failed(OrgFailure Failure) : OrgOutcome;
    }

    private async Task<OrgOutcome> DiscoverOrg(
        RuntimeEnvironment environment,
        ServiceOwnerCode org,
        CancellationToken cancellationToken
    )
    {
        if (!options.AppsHost(environment).TryRender(org, environment, out HostName? host))
        {
            return new OrgOutcome.Failed(
                new OrgFailure(org.Value, $"{options.AppsHost(environment)} gives no host name for it")
            );
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

        // kuberneteswrapper lists itself, so a list without it did not come from a working cluster.
        if (listed is null || !listed.Exists(d => d.Release == KubernetesWrapperRelease))
        {
            return new OrgOutcome.Failed(new OrgFailure(org.Value, $"{url} did not list kuberneteswrapper itself"));
        }

        var deployments = new List<AppDeployment>(listed.Count);
        var notes = new List<string>();
        var seen = new HashSet<AppIdentifier>();
        foreach (KubernetesDeployment deployment in listed)
        {
            if (deployment.Release == KubernetesWrapperRelease)
            {
                continue;
            }

            if (
                TryParseHelmRelease(org, deployment.Release, out AppIdentifier app)
                && AppVersion.TryParse(deployment.Version?.Trim(), out AppVersion version)
            )
            {
                if (seen.Add(app))
                {
                    deployments.Add(new AppDeployment(app, environment, version));
                }
            }
            else
            {
                notes.Add($"{url} lists {deployment.Release} {deployment.Version}, which is not an app and a version.");
            }
        }

        return new OrgOutcome.Listed(deployments, notes);
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
