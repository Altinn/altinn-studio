#nullable enable
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Logic;

/// <summary>
/// Throwaway background driver for the <c>advance == "parkThenRelease"</c> lever: after the
/// scenario service task parks the process (succeeds without auto-advancing), this schedules a
/// fire-and-forget task that waits a few seconds and then drives an ordinary authorized
/// <c>PUT process/next</c> against the app's own public URL — imitating an external system whose
/// callback handler advances the process. Deliberately an out-of-process-style HTTP call (token +
/// public route through localtest) rather than an in-process IProcessEngine shortcut: it exercises
/// the exact path a real callback integration would.
///
/// Localtest-only by construction (the token comes from localtest's /Home/GetTestOrgToken); this
/// is a fixture app, so that is fine.
/// </summary>
public sealed class ParkedTaskReleaser
{
    /// <summary>How long the process stays parked before the release fires. Long enough to see
    /// (and refresh) the waiting view, short enough that the e2e suite and a curious human are
    /// not kept waiting.</summary>
    public static readonly TimeSpan ReleaseDelay = TimeSpan.FromSeconds(5);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<PlatformSettings> _platformSettings;
    private readonly ILogger<ParkedTaskReleaser> _logger;

    public ParkedTaskReleaser(
        IHttpClientFactory httpClientFactory,
        IOptions<PlatformSettings> platformSettings,
        ILogger<ParkedTaskReleaser> logger
    )
    {
        _httpClientFactory = httpClientFactory;
        _platformSettings = platformSettings;
        _logger = logger;
    }

    /// <summary>
    /// Schedules the release and returns immediately. Failures are logged, never thrown — a
    /// broken release leaves the process parked, which the manual process/next recipe in the
    /// README can always recover.
    /// </summary>
    public void ScheduleRelease(string org, string appId, string instanceId)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(ReleaseDelay);
                await Release(org, appId, instanceId);
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "parkThenRelease: failed to release parked instance {InstanceId}",
                    instanceId
                );
            }
        });
    }

    private async Task Release(string org, string appId, string instanceId)
    {
        // The storage endpoint is "{localtest base}/storage/api/v1/" in every environment this
        // fixture runs in, so trimming the suffix yields the base that serves both the token
        // endpoint and the app's public route.
        string baseUrl = _platformSettings
            .Value.ApiStorageEndpoint.TrimEnd('/')
            .Replace("/storage/api/v1", string.Empty, StringComparison.Ordinal);

        using HttpClient client = _httpClientFactory.CreateClient(nameof(ParkedTaskReleaser));

        // A service-owner (org) token, like the Maskinporten token a real callback integration
        // would present — a user token is basically unheard of in a callback setting. The policy's
        // service-owner rule explicitly permits the task-type action ("scenario") for the org.
        // orgNumber must be explicit: ttd's orgnr is empty in the CDN org registry, and without it
        // localtest omits the org-number claim, which the app's service-owner token parsing
        // requires. The number itself is informational (authorization keys on the org claim);
        // this is Digdir's, the conventional stand-in for ttd in test setups.
        string token = (
            await client.GetStringAsync(
                $"{baseUrl}/Home/GetTestOrgToken/{org}?orgNumber=991825827"
            )
        ).Trim('"');

        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"{baseUrl}/{appId}/instances/{instanceId}/process/next"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        HttpResponseMessage response = await client.SendAsync(request);
        _logger.LogInformation(
            "parkThenRelease: released parked instance {InstanceId} -> {StatusCode}",
            instanceId,
            (int)response.StatusCode
        );
        response.EnsureSuccessStatusCode();
    }
}
