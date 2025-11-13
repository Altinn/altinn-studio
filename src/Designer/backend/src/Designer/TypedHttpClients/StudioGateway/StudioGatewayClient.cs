using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Alerts;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClient.StudioGateway;

public class StudioGatewayClient(
    HttpClient httpClient,
    IOptions<StudioGatewaySettings> studioGatewaySettings
    ) : IStudioGatewayClient
{
    private readonly StudioGatewaySettings _studioGatewaySettings = studioGatewaySettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string apiToken = studioGatewaySettings.Token;
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUri = studioGatewaySettings.GetBaseUri(org);
        string url = $"{baseUri}/api/v1/alerts";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<StudioGatewayAlert>>(options, cancellationToken: cancellationToken);
    }
}
