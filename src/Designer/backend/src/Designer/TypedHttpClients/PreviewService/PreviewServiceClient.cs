using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.TypedHttpClients.PreviewService;

/// <summary>
/// Calls the preview service's internal API. The service trusts the developer this client names, because only Designer
/// reaches its internal port.
/// </summary>
public class PreviewServiceClient(HttpClient httpClient, PreviewServiceSettings settings) : IPreviewServiceClient
{
    /// <inheritdoc />
    public async Task<Uri?> StartSession(string developer, string org, string app, CancellationToken cancellationToken)
    {
        Uri baseUrl =
            settings.InternalBaseUrl
            ?? throw new InvalidOperationException(
                $"{nameof(PreviewServiceSettings)}:{nameof(PreviewServiceSettings.InternalBaseUrl)} is not set."
            );

        using JsonContent content = JsonContent.Create(new StartSessionRequest(developer, org, app));
        using HttpResponseMessage response = await httpClient.PostAsync(
            new Uri(baseUrl, "sessions"),
            content,
            cancellationToken
        );
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        StartSessionResponse? session = await response.Content.ReadFromJsonAsync<StartSessionResponse>(
            cancellationToken
        );
        return session?.Url ?? throw new InvalidOperationException("The preview service returned no session URL.");
    }

    private sealed record StartSessionRequest(string Developer, string Org, string App);

    private sealed record StartSessionResponse(Uri? Url);
}
