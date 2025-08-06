using System.Text.Json.Serialization;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;

namespace Altinn.Studio.Admin.Services;

/// <summary>
/// Implementation of the applications service using kuberneteswrapper.
/// </summary>
public class KubernetesWrapperService : IKubernetesWrapperService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationsService"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client to be used for API requests.</param>
    /// <param name="cdnConfigService">The CDN configuration service.</param>
    public KubernetesWrapperService(HttpClient httpClient, ICdnConfigService cdnConfigService)
    {
        _httpClient = httpClient;
        _cdnConfigService = cdnConfigService;
    }

    /// <inheritdoc />
    public async Task<List<AppException>?> GetAppExceptions(
        string org,
        string env,
        string app,
        string time,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();

        //var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
        var response = await _httpClient.GetAsync(
            $"http://localhost:5004/api/v1/appexceptions?app={app}&time={time}"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<AppException>>(cancellationToken: ct);
    }

    /// <inheritdoc />
    public async Task<List<AppFailedRequest>?> GetAppFailedRequests(
        string org,
        string env,
        string app,
        string time,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();

        //var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
        var response = await _httpClient.GetAsync(
            $"http://localhost:5004/api/v1/appfailedrequests?app={app}&time={time}"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<AppFailedRequest>>(cancellationToken: ct);
    }

    /// <inheritdoc />
    public async Task<List<ContainerLog>?> GetContainerLogs(
        string org,
        string env,
        string app,
        string time,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();

        //var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
        var response = await _httpClient.GetAsync(
            $"http://localhost:5004/api/v1/containerlogs?app={app}&time={time}"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<ContainerLog>>(cancellationToken: ct);
    }
}
