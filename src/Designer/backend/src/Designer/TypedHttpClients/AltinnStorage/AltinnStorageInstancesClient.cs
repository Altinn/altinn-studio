#nullable enable

using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

public class AltinnStorageInstancesClient : IAltinnStorageInstancesClient
{
    private readonly HttpClient _httpClient;
    private readonly IEnvironmentsService _environmentsService;
    private readonly PlatformSettings _platformSettings;
    private readonly ILogger<AltinnStorageInstancesClient> _logger;

    private const int SIZE = 10;

    public AltinnStorageInstancesClient(
        HttpClient httpClient,
        IEnvironmentsService environmentsService,
        PlatformSettings options,
        ILogger<AltinnStorageInstancesClient> logger
    )
    {
        _httpClient = httpClient;
        _environmentsService = environmentsService;
        _platformSettings = options;
        _logger = logger;
    }

    public async Task<QueryResponse<SimpleInstance>> GetInstances(
        string org,
        string env,
        string app,
        string? continuationToken,
        string? currentTaskFilter,
        bool? processIsCompleteFilter,
        CancellationToken ct
    )
    {
        var platformUri = await _environmentsService.CreatePlatformUri(env);
        var uri = $"{platformUri}{_platformSettings.ApiStorageInstancesUri}{org}/{app}";

        uri = QueryHelpers.AddQueryString(uri, "size", SIZE.ToString());

        if (!string.IsNullOrEmpty(continuationToken))
        {
            uri = QueryHelpers.AddQueryString(uri, "continuationToken", continuationToken);
        }

        if (!string.IsNullOrEmpty(currentTaskFilter))
        {
            uri = QueryHelpers.AddQueryString(uri, "process.currentTask", currentTaskFilter);
        }

        if (processIsCompleteFilter != null)
        {
            uri = QueryHelpers.AddQueryString(
                uri,
                "process.isComplete",
                processIsCompleteFilter.Value.ToString()
            );
        }

        using var response = await _httpClient.GetAsync(uri, ct);
        response.EnsureSuccessStatusCode();

        var queryResponse = await response.Content.ReadFromJsonAsync<QueryResponse<SimpleInstance>>(
            ct
        );

        if (queryResponse == null)
        {
            throw new JsonException("Could not deserialize Instance query response");
        }

        return queryResponse;
    }
}
