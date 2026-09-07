using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;

public class AppUpgradeEngineClient : IAppUpgradeEngineClient
{
    private const string UpgradesPath = "/api/v1/studioctl/apps/upgrades";

    private static readonly JsonSerializerOptions s_jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;

    public AppUpgradeEngineClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<AppUpgradeEngineResponse> RunUpgradeAsync(
        AppUpgradeEngineRequest request,
        CancellationToken cancellationToken
    )
    {
        using HttpResponseMessage response = await _httpClient.PostAsJsonAsync(
            UpgradesPath,
            request,
            s_jsonOptions,
            cancellationToken
        );

        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadFromJsonAsync<AppUpgradeEngineResponse>(s_jsonOptions, cancellationToken)
                ?? throw new AppUpgradeEngineException("The upgrade engine returned an empty response.");
        }

        string body = await response.Content.ReadAsStringAsync(cancellationToken);
        string message = TryReadMessage(body) ?? body;
        throw new AppUpgradeEngineException($"The upgrade engine returned {(int)response.StatusCode}: {message}");
    }

    private static string? TryReadMessage(string body)
    {
        try
        {
            using JsonDocument document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("message", out JsonElement message) ? message.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
