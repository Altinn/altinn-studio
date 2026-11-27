using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.TypedHttpClients.PreviewService;

/// <summary>
/// Calls the preview service's internal API. The service trusts the developer this client names, because only Designer
/// reaches its internal port.
/// </summary>
public class PreviewServiceClient(HttpClient httpClient, PreviewServiceSettings settings) : IPreviewServiceClient
{
    private Uri BaseUrl =>
        settings.InternalBaseUrl
        ?? throw new InvalidOperationException(
            $"{nameof(PreviewServiceSettings)}:{nameof(PreviewServiceSettings.InternalBaseUrl)} is not set."
        );

    /// <inheritdoc />
    public async Task<Uri?> StartSession(
        string developer,
        string org,
        string app,
        PreviewParty party,
        CancellationToken cancellationToken
    )
    {
        Uri baseUrl = BaseUrl;
        using JsonContent content = JsonContent.Create(
            new StartSessionRequest(developer, org, app, party == PreviewParty.Organization ? "organization" : "person")
        );
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

    /// <inheritdoc />
    public async Task<string?> CreateInstance(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        Uri baseUrl = BaseUrl;
        using JsonContent content = JsonContent.Create(
            new CreateInstanceRequest(developer, org, app, sessionUrl, taskId)
        );
        using HttpResponseMessage response = await httpClient.PostAsync(
            new Uri(baseUrl, "sessions/instances"),
            content,
            cancellationToken
        );
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        CreateInstanceResponse? instance = await response.Content.ReadFromJsonAsync<CreateInstanceResponse>(
            cancellationToken
        );
        return instance?.InstanceId
            ?? throw new InvalidOperationException("The preview service returned no instance ID.");
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<PreviewFormDataElement>?> ReadFormData(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string instanceId,
        CancellationToken cancellationToken
    )
    {
        Uri baseUrl = BaseUrl;
        using JsonContent content = JsonContent.Create(
            new FormDataRequest(developer, org, app, sessionUrl, instanceId)
        );
        using HttpResponseMessage response = await httpClient.PostAsync(
            new Uri(baseUrl, "sessions/form-data"),
            content,
            cancellationToken
        );
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        PreviewFormDataResponse? formData = await response.Content.ReadFromJsonAsync<PreviewFormDataResponse>(
            cancellationToken
        );
        return formData?.DataElements
            ?? throw new InvalidOperationException("The preview service returned no form data.");
    }

    /// <inheritdoc />
    public async Task<bool> WriteFormData(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string instanceId,
        Guid dataElementId,
        JsonObject data,
        CancellationToken cancellationToken
    )
    {
        Uri baseUrl = BaseUrl;
        using JsonContent content = JsonContent.Create(
            new FormDataRequest(developer, org, app, sessionUrl, instanceId, dataElementId, data)
        );
        using HttpResponseMessage response = await httpClient.PutAsync(
            new Uri(baseUrl, "sessions/form-data"),
            content,
            cancellationToken
        );
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    private sealed record FormDataRequest(
        string Developer,
        string Org,
        string App,
        Uri SessionUrl,
        string InstanceId,
        Guid? DataElementId = null,
        JsonObject? Data = null
    );

    private sealed record StartSessionRequest(string Developer, string Org, string App, string Party);

    private sealed record CreateInstanceRequest(
        string Developer,
        string Org,
        string App,
        Uri SessionUrl,
        string TaskId
    );

    private sealed record CreateInstanceResponse(string? InstanceId);

    private sealed record StartSessionResponse(Uri? Url);
}
