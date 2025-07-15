using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.App;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.AccessManagement;

/// <summary>
/// Client for interacting with the Access Management API.
/// This client is responsible for delegating and revoking rights for app instances.
/// </summary>
/// <param name="logger">The logger.</param>
/// <param name="httpClient">The httpClient.</param>
/// <param name="appMetadata">The application metadata.</param>
/// <param name="accessTokenGenerator">The access token generator.</param>
/// <param name="platformSettings">The platform settings.</param>
/// <param name="telemetry">Telemetry.</param>
internal sealed class AccessManagementClient(
    ILogger<AccessManagementClient> logger,
    HttpClient httpClient,
    IAppMetadata appMetadata,
    IAccessTokenGenerator accessTokenGenerator,
    IOptions<PlatformSettings> platformSettings,
    Telemetry? telemetry = null
) : IAccessManagementClient
{
    private const string ApplicationJsonMediaType = "application/json";

    /// <inheritdoc />
    public async Task<DelegationResponse> DelegateRights(DelegationRequest delegation, CancellationToken ct = default)
    {
        using var activity = telemetry?.StartAppInstanceDelegationActivity();

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        try
        {
            UrlHelper urlHelper = new(platformSettings.Value);
            var application = await appMetadata.GetApplicationMetadata();

            var uri = urlHelper.CreateInstanceDelegationUrl(delegation.ResourceId, delegation.InstanceId);
            var body = JsonSerializer.Serialize(DelegationRequest.ConvertToDto(delegation));
            logger.LogInformation(
                "Delegating rights to {DelegationTo} from {DelegationFrom} for {ResourceId}",
                delegation.To?.Value,
                delegation.From?.Value,
                delegation.ResourceId
            );

            using HttpRequestMessage httpRequestMessage = CreateRequestMessage(application, uri, body);
            using (httpResponseMessage = await httpClient.SendAsync(httpRequestMessage, ct))
            {
                httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
                return GetResponseOrThrow(httpResponseMessage, httpContent);
            }
        }
        catch (Exception e)
        {
            AccessManagementRequestException ex = CreateAccessManagementException(httpResponseMessage, httpContent, e);
            logger.LogError(e, "Error when processing access management delegate request.");
            throw ex;
        }
    }

    /// <inheritdoc />
    public async Task<DelegationResponse> RevokeRights(DelegationRequest delegation, CancellationToken ct = default)
    {
        using var activity = telemetry?.StartAppInstanceRevokeActivity();

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;

        try
        {
            UrlHelper urlHelper = new(platformSettings.Value);
            var application = await appMetadata.GetApplicationMetadata();

            var uri = urlHelper.CreateInstanceRevokeUrl(delegation.ResourceId, delegation.InstanceId);
            var body = JsonSerializer.Serialize(DelegationRequest.ConvertToDto(delegation));
            logger.LogInformation(
                "Revoking rights from {DelegationTo} for {ResourceId}",
                delegation.To?.Value,
                delegation.ResourceId
            );

            using HttpRequestMessage httpRequestMessage = CreateRequestMessage(application, uri, body);
            using (httpResponseMessage = await httpClient.SendAsync(httpRequestMessage, ct))
            {
                httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
                return GetResponseOrThrow(httpResponseMessage, httpContent);
            }
        }
        catch (Exception e)
        {
            AccessManagementRequestException ex = CreateAccessManagementException(httpResponseMessage, httpContent, e);
            logger.LogError(e, "Error when processing access management revoke request.");
            throw ex;
        }
    }

    private static DelegationResponse GetResponseOrThrow(HttpResponseMessage httpResponseMessage, string httpContent)
    {
        if (!httpResponseMessage.IsSuccessStatusCode)
        {
            string errorDetails = "Unknown error";
            try
            {
                var problemDetails = JsonSerializer.Deserialize<JsonElement>(httpContent);
                errorDetails = FormatErrorDetails(errorDetails, problemDetails);
            }
            catch (JsonException ex)
            {
                errorDetails = $"Failed to parse error details: {ex.Message}";
            }

            throw new HttpRequestException(
                $"Access Management API error ({httpResponseMessage.StatusCode}): {errorDetails}. Full response: {httpContent}"
            );
        }
        DelegationResponse? response = JsonSerializer.Deserialize<DelegationResponse>(httpContent);
        return response ?? throw new JsonException("Couldn't deserialize access management response.");
    }

    private HttpRequestMessage CreateRequestMessage(Models.ApplicationMetadata application, string uri, string body)
    {
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = new StringContent(body, new MediaTypeHeaderValue(ApplicationJsonMediaType)),
        };
        httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(ApplicationJsonMediaType));
        var token = accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App);
        httpRequestMessage.Headers.Add(Constants.General.PlatformAccessTokenHeaderName, token);
        return httpRequestMessage;
    }

    internal static string FormatErrorDetails(string errorDetails, JsonElement problemDetails)
    {
        if (problemDetails.TryGetProperty("detail", out var detail))
        {
            errorDetails = detail.GetString() ?? errorDetails;
        }
        if (problemDetails.TryGetProperty("validationErrors", out var errors))
        {
            errorDetails += $" ValidationErrors: {errors.GetRawText()}";
        }
        if (problemDetails.TryGetProperty("code", out var code))
        {
            errorDetails += $" Code: {code.GetString()}";
        }

        return errorDetails;
    }

    private static AccessManagementRequestException CreateAccessManagementException(
        HttpResponseMessage? httpResponseMessage,
        string? httpContent,
        Exception e
    )
    {
        return e is AccessManagementRequestException exception
            ? exception
            : new AccessManagementRequestException(
                $"Something went wrong when processing the access management request.",
                null,
                httpResponseMessage?.StatusCode,
                httpContent,
                e
            );
    }
}
