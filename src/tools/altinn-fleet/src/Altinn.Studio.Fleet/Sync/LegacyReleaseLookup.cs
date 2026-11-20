using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>
/// Finds releases one app at a time with Designer's older releases endpoint, for installations that do not have
/// the lookup yet. That endpoint answers only for service owners the key's user is a member of. Delete this once
/// every installation has the lookup.
/// </summary>
internal sealed class LegacyReleaseLookup(HttpClient http, int parallelism, TimeProvider time)
{
    public async Task<LookupOutcome> Lookup(
        StudioHost host,
        string key,
        List<AppDeployment> deployments,
        CancellationToken cancellationToken
    )
    {
        var found = new Dictionary<AppIdentifier, ResolvedRelease>();
        var errors = new Dictionary<AppIdentifier, AppFailure>();
        var gate = new Lock();
        await Parallel.ForEachAsync(
            deployments,
            new ParallelOptions { MaxDegreeOfParallelism = parallelism, CancellationToken = cancellationToken },
            async (deployment, token) =>
            {
                AppLookup result = await Lookup(host, key, deployment, token);
                lock (gate)
                {
                    switch (result)
                    {
                        case AppLookup.Found(ResolvedRelease release):
                            found[deployment.App] = release;
                            break;
                        case AppLookup.Failed(AppFailure error):
                            errors[deployment.App] = error;
                            break;
                    }
                }
            }
        );

        return new LookupOutcome(
            found,
            errors,
            $"{host.HostName} has no release lookup, so releases were looked up one app at a time."
        );
    }

    private abstract record AppLookup
    {
        public sealed record Found(ResolvedRelease Release) : AppLookup;

        public sealed record NotFound : AppLookup;

        public sealed record Failed(AppFailure Failure) : AppLookup;
    }

    private async Task<AppLookup> Lookup(
        StudioHost host,
        string key,
        AppDeployment deployment,
        CancellationToken cancellationToken
    )
    {
        AppIdentifier app = deployment.App;
        string url = $"https://{host.HostName}/designer/api/{app.Org}/{app.App}/releases";
        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Get, url);
            message.Headers.Add("X-Api-Key", key);
            using HttpResponseMessage response = await http.SendAsync(
                message,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );
            if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden)
            {
                return new AppLookup.NotFound();
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"{url} answered {(int)response.StatusCode}");
            }

            DesignerReleases? releases = await response.Content.ReadFromJsonAsync(
                FleetJsonContext.Default.DesignerReleases,
                cancellationToken
            );
            AppRelease? release = (releases?.Results ?? [])
                .Where(r =>
                    r.TagName == deployment.Version.Value
                    && string.Equals(r.Build?.Result, "succeeded", StringComparison.OrdinalIgnoreCase)
                )
                .Select(r =>
                    CommitSha.TryParse(r.TargetCommitish, out CommitSha commit) && r.Created is { } created
                        ? new AppRelease(app, deployment.Version, commit, created)
                        : null
                )
                .OfType<AppRelease>()
                .MaxBy(r => r.Created);
            return release is null ? new AppLookup.NotFound() : new AppLookup.Found(new ResolvedRelease(release, host));
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or IOException)
        {
            return new AppLookup.Failed(
                new AppFailure(
                    app,
                    deployment.Version,
                    FailureKind.Error,
                    $"release lookup at {host.HostName} failed: {FleetException.Describe(ex)}",
                    time.GetUtcNow()
                )
            );
        }
    }
}
