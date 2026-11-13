using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>What one Studio installation knew about a set of deployments.</summary>
internal sealed record LookupOutcome(
    Dictionary<AppIdentifier, ResolvedRelease> Found,
    Dictionary<AppIdentifier, AppFailure> Errors,
    string? Note
);

/// <summary>A release and the Studio installation it was found in, which is where its source is downloaded from.</summary>
internal sealed record ResolvedRelease(AppRelease Release, StudioHost Host);

/// <summary>What resolving releases found, and what it did not.</summary>
internal sealed record Resolution(
    Dictionary<AppIdentifier, ResolvedRelease> Releases,
    Dictionary<AppIdentifier, AppFailure> Failures,
    List<string> Notes
);

/// <summary>
/// Finds the commit each deployed version was released from, with Designer's release lookup on each Studio
/// installation in turn. What one installation does not know is looked up in the next.
/// </summary>
internal sealed class ReleaseResolver(
    HttpClient http,
    StudioKeys keys,
    IReadOnlyList<StudioHost> hosts,
    int parallelism,
    TimeProvider time
)
{
    internal const int LookupBatchSize = 1000;

    public async Task<Resolution> Resolve(
        IReadOnlyList<AppDeployment> deployments,
        Action<int, int> onProgress,
        CancellationToken cancellationToken
    )
    {
        var resolution = new Resolution([], [], []);
        var remaining = new List<AppDeployment>(deployments);
        var withoutKey = new List<string>();
        onProgress(0, deployments.Count);
        foreach (StudioHost host in hosts)
        {
            if (remaining.Count == 0)
            {
                break;
            }

            string? key = await keys.Get(host, cancellationToken);
            if (key is null)
            {
                withoutKey.Add(host.HostName.Value);
                resolution.Notes.Add($"No API key for {host.HostName}, so releases there were not looked up.");
                continue;
            }

            LookupOutcome outcome = await Lookup(host, key, remaining, cancellationToken);
            if (outcome.Note is not null)
            {
                resolution.Notes.Add(outcome.Note);
            }

            foreach ((AppIdentifier app, ResolvedRelease release) in outcome.Found)
            {
                resolution.Releases[app] = release;
            }

            foreach ((AppIdentifier app, AppFailure failure) in outcome.Errors)
            {
                resolution.Failures[app] = failure;
            }

            remaining.RemoveAll(d => outcome.Found.ContainsKey(d.App) || outcome.Errors.ContainsKey(d.App));
            onProgress(deployments.Count - remaining.Count, deployments.Count);
        }

        if (withoutKey.Count == hosts.Count)
        {
            // Recording every app as unavailable would keep them from being tried again after a login.
            throw new FleetException(
                "There is no Altinn Studio API key to look up releases with. Run `studioctl auth login`."
            );
        }

        DateTimeOffset now = time.GetUtcNow();
        string reason =
            withoutKey.Count == 0
                ? "no release of this version was found in Studio"
                : $"no release of this version was found in Studio, without a key for {string.Join(" and ", withoutKey)}";
        foreach (AppDeployment deployment in remaining)
        {
            resolution.Failures[deployment.App] = new AppFailure(
                deployment.App,
                deployment.Version,
                FailureKind.Unavailable,
                reason,
                now
            );
        }

        onProgress(deployments.Count, deployments.Count);
        return resolution;
    }

    private async Task<LookupOutcome> Lookup(
        StudioHost host,
        string key,
        List<AppDeployment> deployments,
        CancellationToken cancellationToken
    )
    {
        var found = new Dictionary<AppIdentifier, ResolvedRelease>();
        var errors = new Dictionary<AppIdentifier, AppFailure>();
        var byKey = deployments.ToDictionary(d => (d.App.Org.Value, d.App.App.Value, d.Version.Value));
        for (int offset = 0; offset < deployments.Count; offset += LookupBatchSize)
        {
            List<AppDeployment> batch = deployments.GetRange(
                offset,
                Math.Min(LookupBatchSize, deployments.Count - offset)
            );
            var request = new ReleaseLookupRequest(
                batch.ConvertAll(d => new ReleaseLookupItem(d.App.Org.Value, d.App.App.Value, d.Version.Value))
            );
            string url = $"https://{host.HostName}/designer/api/v1/releases/lookup";
            try
            {
                using var message = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(request, FleetJsonContext.Default.ReleaseLookupRequest),
                };
                message.Headers.Add("X-Api-Key", key);
                using HttpResponseMessage response = await http.SendAsync(
                    message,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken
                );
                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    // The lookup is not deployed to this installation yet.
                    return await new LegacyReleaseLookup(http, parallelism, time).Lookup(
                        host,
                        key,
                        deployments,
                        cancellationToken
                    );
                }

                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    return new LookupOutcome(
                        found,
                        errors,
                        $"{host.HostName} refused the API key ({(int)response.StatusCode})."
                    );
                }

                if (!response.IsSuccessStatusCode)
                {
                    throw new HttpRequestException($"{url} answered {(int)response.StatusCode}");
                }

                ReleaseLookupResponse? body = await response.Content.ReadFromJsonAsync(
                    FleetJsonContext.Default.ReleaseLookupResponse,
                    cancellationToken
                );
                foreach (ReleaseLookupResult result in body?.Releases ?? [])
                {
                    if (
                        result is not { Org: { } org, App: { } app, Version: { } version }
                        || !byKey.TryGetValue((org, app, version), out AppDeployment? deployment)
                    )
                    {
                        continue;
                    }

                    if (CommitSha.TryParse(result.Commit, out CommitSha commit) && result.Created is { } created)
                    {
                        found[deployment.App] = new ResolvedRelease(
                            new AppRelease(deployment.App, deployment.Version, commit, created),
                            host
                        );
                    }
                    else
                    {
                        errors[deployment.App] = new AppFailure(
                            deployment.App,
                            deployment.Version,
                            FailureKind.Error,
                            $"{host} gave a release without a commit SHA and a time",
                            time.GetUtcNow()
                        );
                    }
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or IOException)
            {
                // The apps in this batch may have been released here, so they are not looked for elsewhere.
                DateTimeOffset now = time.GetUtcNow();
                foreach (AppDeployment deployment in batch)
                {
                    errors[deployment.App] = new AppFailure(
                        deployment.App,
                        deployment.Version,
                        FailureKind.Error,
                        $"release lookup at {host.HostName} failed: {FleetException.Describe(ex)}",
                        now
                    );
                }
            }
        }

        return new LookupOutcome(found, errors, null);
    }
}

/// <summary>The API keys of a sync, asked for once per installation and kept until the sync ends.</summary>
internal sealed class StudioKeys(IStudioCredentials credentials)
{
    private readonly Dictionary<StudioHost, Task<string?>> _keys = [];
    private readonly Lock _gate = new();

    public Task<string?> Get(StudioHost host, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            if (!_keys.TryGetValue(host, out Task<string?>? key))
            {
                key = credentials.GetApiKey(host, cancellationToken).AsTask();
                _keys[host] = key;
            }

            return key;
        }
    }
}
