using System.Net.Http.Headers;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Admin.Services;

class TestStorageService : IStorageService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;
    private readonly TestToolsTokenGeneratorService _tokenGeneratorService;

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

    public async Task<List<Instance>> GetInstances(string org, string env, string app)
    {
        var platformBaseUrl = await _cdnConfigService.GetPlatformBaseUrl(env);

        var token = await _tokenGeneratorService.GetTestToken(org, env);

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformBaseUrl}/storage/api/v1/instances?org={org}&appId={org}/{app}&mainVersionInclude=3"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        var queryResponse =
            JsonConvert.DeserializeObject<QueryResponse<Instance>>(responseString)
            ?? throw new JsonException("Could not deserialize Instance query response");

        if (queryResponse == null)
        {
            throw new Exception("Unexpeced response from storage");
        }

        var instances = new List<Instance>();
        instances.AddRange(queryResponse.Instances);

        while (!string.IsNullOrEmpty(queryResponse.Next))
        {
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
                throw new Exception("Unexpeced response from storage");
            }

            instances.AddRange(queryResponse.Instances);
        }

        return instances;
    }
}
