using System.Net.Http.Headers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Newtonsoft.Json;

namespace Altinn.Studio.Admin.Services;

/// <summary>
/// Implementation of the storage service that uses AltinnTestTools to generate tokens for test environments.
/// </summary>
class TestStorageService : IStorageService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;
    private readonly TestToolsTokenGeneratorService _tokenGeneratorService;

    // TODO: We don't have good pagination support in Storage yet,
    // and some apps have so many instances that it is impractical to fetch them all,
    // this is a completely arbitrary limit to the number of pages to fetch before stopping.
    private const int MAX_INSTANCE_FETCH = 20;

    /// <summary>
    /// Initializes a new instance of the <see cref="TestStorageService"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client to use for API requests.</param>
    /// <param name="cdnConfigService">The CDN configuration service.</param>
    /// <param name="tokenGeneratorService">The token generator service used for authentication.</param>
    public TestStorageService(
        HttpClient httpClient,
        ICdnConfigService cdnConfigService,
        TestToolsTokenGeneratorService tokenGeneratorService
    )
    {
        _httpClient = httpClient;
        _cdnConfigService = cdnConfigService;
        _tokenGeneratorService = tokenGeneratorService;
    }

    /// <inheritdoc />
    public async Task<List<SimpleInstance>> GetInstances(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var platformBaseUrlTask = _cdnConfigService.GetPlatformBaseUrl(env);
        var tokenTask = _tokenGeneratorService.GetTestToken(org, env);

        await Task.WhenAll(platformBaseUrlTask, tokenTask);

        var platformBaseUrl = await platformBaseUrlTask;
        var token = await tokenTask;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances?org={org}&appId={org}/{app}&mainVersionInclude=3"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        var queryResponse = JsonConvert.DeserializeObject<QueryResponse<Instance>>(responseString);

        if (queryResponse == null)
        {
            throw new JsonException("Could not deserialize Instance query response");
        }

        var instances = new List<SimpleInstance>();
        instances.AddRange(
            queryResponse.Instances.Select(instance => SimpleInstance.FromInstance(instance))
        );

        int numFetch = 1;
        while (!string.IsNullOrEmpty(queryResponse.Next) && numFetch < MAX_INSTANCE_FETCH)
        {
            ct.ThrowIfCancellationRequested();

            request = new HttpRequestMessage(HttpMethod.Get, queryResponse.Next);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            response = await _httpClient.SendAsync(request);

            response.EnsureSuccessStatusCode();
            responseString = await response.Content.ReadAsStringAsync();
            queryResponse =
                JsonConvert.DeserializeObject<QueryResponse<Instance>>(responseString)
                ?? throw new JsonException("Could not deserialize Instance query response");

            if (queryResponse == null)
            {
                throw new Exception("Unexpected response from storage");
            }

            instances.AddRange(
                queryResponse.Instances.Select(instance => SimpleInstance.FromInstance(instance))
            );
            numFetch++;
        }

        return instances;
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    )
    {
        var platformBaseUrlTask = _cdnConfigService.GetPlatformBaseUrl(env);
        var tokenTask = _tokenGeneratorService.GetTestToken(org, env);

        await Task.WhenAll(platformBaseUrlTask, tokenTask);

        var platformBaseUrl = await platformBaseUrlTask;
        var token = await tokenTask;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances/1337/{instanceId}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        var instance = JsonConvert.DeserializeObject<Instance>(responseString);

        if (instance == null)
        {
            throw new JsonException("Could not deserialize Instance response");
        }

        return instance;
    }

    /// <inheritdoc />
    public async Task<(Stream, string, string?)> GetInstanceDataElement(
        string org,
        string env,
        string instanceId,
        string dataElementId,
        CancellationToken ct
    )
    {
        var platformBaseUrlTask = _cdnConfigService.GetPlatformBaseUrl(env);
        var tokenTask = _tokenGeneratorService.GetTestToken(org, env);

        await Task.WhenAll(platformBaseUrlTask, tokenTask);

        var platformBaseUrl = await platformBaseUrlTask;
        var token = await tokenTask;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances/1337/{instanceId}/data/{dataElementId}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();

        var contentType =
            response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
        var fileName = response.Content.Headers.ContentDisposition?.FileName;
        var stream = await response.Content.ReadAsStreamAsync();

        return (stream, contentType, fileName);
    }

    /// <inheritdoc />
    public async Task<List<ProcessHistoryItem>> GetProcessHistory(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    )
    {
        var platformBaseUrlTask = _cdnConfigService.GetPlatformBaseUrl(env);
        var tokenTask = _tokenGeneratorService.GetTestToken(org, env);

        await Task.WhenAll(platformBaseUrlTask, tokenTask);

        var platformBaseUrl = await platformBaseUrlTask;
        var token = await tokenTask;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances/1337/{instanceId}/process/history"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        var processHistoryList =
            JsonConvert.DeserializeObject<ProcessHistoryList>(responseString)
            ?? throw new JsonException("Could not deserialize ProcessHistory response");

        if (processHistoryList == null)
        {
            throw new Exception("Unexpected response from storage");
        }

        return processHistoryList.ProcessHistory;
    }

    /// <inheritdoc />
    public async Task<List<InstanceEvent>> GetInstanceEvents(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    )
    {
        var platformBaseUrlTask = _cdnConfigService.GetPlatformBaseUrl(env);
        var tokenTask = _tokenGeneratorService.GetTestToken(org, env);

        await Task.WhenAll(platformBaseUrlTask, tokenTask);

        var platformBaseUrl = await platformBaseUrlTask;
        var token = await tokenTask;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances/1337/{instanceId}/events"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        var instanceEventList =
            JsonConvert.DeserializeObject<InstanceEventList>(responseString)
            ?? throw new JsonException("Could not deserialize InstanceEvents response");

        if (instanceEventList == null)
        {
            throw new Exception("Unexpected response from storage");
        }

        return instanceEventList.InstanceEvents;
    }
}
