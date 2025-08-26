using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;

namespace Altinn.Studio.Admin.Services;

/// <summary>
/// Implementation of the applications service using kuberneteswrapper.
/// </summary>
public class KubernetesWrapperService : IKubernetesWrapperService
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationsService"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client to be used for API requests.</param>
    /// <param name="cdnConfigService">The CDN configuration service.</param>
    public KubernetesWrapperService(HttpClient httpClient, ICdnConfigService cdnConfigService)
    {
        _httpClient = httpClient;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Log>> GetLogs(
        string org,
        string env,
        int time,
        string? app,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();

        //var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
        var response = await _httpClient.GetAsync(
            $"http://localhost:5004/api/v1/logs?app={app}&time={time}"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<IEnumerable<Log>>(cancellationToken: ct) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ContainerLog>> GetContainerLogs(
        string org,
        string env,
        int time,
        string? app,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();

        //var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
        var response = await _httpClient.GetAsync(
            $"http://localhost:5004/api/v1/containerlogs?app={app}&time={time}"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<IEnumerable<ContainerLog>>(cancellationToken: ct) ?? [];
    }
}
