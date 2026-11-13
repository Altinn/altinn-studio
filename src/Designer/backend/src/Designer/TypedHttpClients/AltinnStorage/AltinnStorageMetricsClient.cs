using System;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

public class AltinnStorageMetricsClient : IAltinnStorageMetricsClient
{
    private readonly HttpClient _httpClient;
    private readonly IEnvironmentsService _environmentsService;
    private readonly PlatformSettings _platformSettings;

    public AltinnStorageMetricsClient(
        HttpClient httpClient,
        IEnvironmentsService environmentsService,
        PlatformSettings platformSettings
    )
    {
        _httpClient = httpClient;
        _environmentsService = environmentsService;
        _platformSettings = platformSettings;
    }

    public async Task<StudioDailyMetrics> GetDailyMetrics(string org, string env, DateOnly date, CancellationToken ct)
    {
        var platformUri = await _environmentsService.CreatePlatformUri(env);
        var uri = QueryHelpers.AddQueryString(
            $"{platformUri}{_platformSettings.ApiStorageMetricsUri}{org}",
            "date",
            date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
        );

        using var response = await _httpClient.GetAsync(uri, ct);
        return await response.Content.ReadFromJsonAsync<StudioDailyMetrics>(ct)
            ?? throw new JsonException("Could not deserialize the daily metrics response from Storage.");
    }
}
