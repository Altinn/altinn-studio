using System.Diagnostics;
using System.Net;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>What fetching an app gave.</summary>
internal abstract record FetchOutcome
{
    private FetchOutcome() { }

    /// <summary>The app is extracted to a temporary folder.</summary>
    public sealed record Fetched(StagedApp App) : FetchOutcome;

    /// <summary>The app could not be fetched.</summary>
    public sealed record Failed(AppFailure Failure) : FetchOutcome;
}

/// <summary>Downloads an app's source at a release's commit and extracts it to a temporary folder in one pass.</summary>
internal sealed class AppFetcher(HttpClient http, StudioKeys keys, FleetTelemetry telemetry, TimeProvider time)
{
    // A download that breaks off midway is started again this many times in all.
    private const int MaxAttempts = 2;

    public async Task<FetchOutcome> Fetch(
        AppDeployment deployment,
        ResolvedRelease resolved,
        string stagingPath,
        CancellationToken cancellationToken
    )
    {
        AppIdentifier app = deployment.App;
        long started = Stopwatch.GetTimestamp();
        string? key = await keys.Get(resolved.Host, cancellationToken);
        string url =
            $"https://{resolved.Host.HostName}/repos/api/v1/repos/{app.Org}/{app.App}/archive/{resolved.Release.Commit}.tar.gz";
        for (int attempt = 1; ; attempt++)
        {
            DeleteIfExists(stagingPath);
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                if (key is not null)
                {
                    request.Headers.Add("X-Api-Key", key);
                }

                using HttpResponseMessage response = await http.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken
                );
                if (!response.IsSuccessStatusCode)
                {
                    DeleteIfExists(stagingPath);
                    return new FetchOutcome.Failed(StatusFailure(deployment, resolved.Host, response.StatusCode));
                }

                await using Stream body = await response.Content.ReadAsStreamAsync(cancellationToken);
                var reader = new AppDescriptionReader();
                using var tree = new AppTree();
                AppFiles files = await tree.Extract(body, stagingPath, reader, cancellationToken);
                telemetry.AppsFetched.Add(1);
                telemetry.BytesExtracted.Add(files.Bytes);
                telemetry.FetchDuration.Record(Stopwatch.GetElapsedTime(started).TotalSeconds);
                var release = new StoredRelease(
                    deployment.Version,
                    resolved.Release.Commit,
                    resolved.Host.HostName,
                    resolved.Release.Created,
                    time.GetUtcNow()
                );
                return new FetchOutcome.Fetched(new StagedApp(app, release, stagingPath, files, reader.Build()));
            }
            catch (InvalidArchiveException ex)
            {
                DeleteIfExists(stagingPath);
                return new FetchOutcome.Failed(Failure(deployment, FailureKind.Unavailable, $"{url}: {ex.Message}"));
            }
            catch (Exception ex)
                when (ex is HttpRequestException or IOException && !cancellationToken.IsCancellationRequested)
            {
                DeleteIfExists(stagingPath);
                if (attempt >= MaxAttempts)
                {
                    return new FetchOutcome.Failed(
                        Failure(
                            deployment,
                            FailureKind.Error,
                            $"download from {resolved.Host.HostName} failed: {FleetException.Describe(ex)}"
                        )
                    );
                }
            }
        }
    }

    private AppFailure StatusFailure(AppDeployment deployment, StudioHost host, HttpStatusCode status) =>
        status switch
        {
            HttpStatusCode.NotFound or HttpStatusCode.Forbidden => Failure(
                deployment,
                FailureKind.Unavailable,
                $"{host.HostName} would not give the source ({(int)status}), so the repository is private or the commit is gone"
            ),
            HttpStatusCode.Unauthorized => Failure(
                deployment,
                FailureKind.Error,
                $"{host.HostName} refused the API key (401)"
            ),
            _ => Failure(deployment, FailureKind.Error, $"{host.HostName} answered {(int)status}"),
        };

    private AppFailure Failure(AppDeployment deployment, FailureKind kind, string reason)
    {
        telemetry.AppsFailed.Add(1);
        return new AppFailure(deployment.App, deployment.Version, kind, reason, time.GetUtcNow());
    }

    private static void DeleteIfExists(string path)
    {
        if (Directory.Exists(path))
        {
            Directory.Delete(path, recursive: true);
        }
    }
}
