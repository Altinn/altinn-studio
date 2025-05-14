using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.App;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.AccessManagement;

internal interface IAccessManagementClient
{
    public Task<DelegationResponse> DelegateRights(DelegationRequest delegation, CancellationToken ct);
    public Task<DelegationResponse> RevokeRights(DelegationRequest delegation, CancellationToken ct);
}

internal sealed class AccessManagementClient(
    ILogger<AccessManagementClient> logger,
    HttpClient httpClient,
    IAppMetadata appMetadata,
    IAccessTokenGenerator accessTokenGenerator,
    IOptions<PlatformSettings> platformSettings,
    Telemetry? telemetry = null
) : IAccessManagementClient
{
    public async Task<DelegationResponse> DelegateRights(DelegationRequest delegation, CancellationToken ct)
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

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(body, new MediaTypeHeaderValue("application/json")),
            };
            httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequestMessage.Headers.Add(
                "PlatformAccessToken",
                accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
            );

            httpResponseMessage = await httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
            DelegationResponse? response;
            if (!httpResponseMessage.IsSuccessStatusCode)
            {
                throw new HttpRequestException("Got error status code for access management request.");
            }
            response = JsonSerializer.Deserialize<DelegationResponse>(httpContent);
            if (response is null)
            {
                throw new JsonException("Couldn't deserialize access management response.");
            }
            return response;
        }
        catch (Exception e)
        {
            var ex =
                e is AccessManagementRequestException
                    ? e
                    : new AccessManagementRequestException(
                        $"Something went wrong when processing the access management request.",
                        null,
                        httpResponseMessage?.StatusCode,
                        httpContent,
                        e
                    );
            logger.LogError(ex, "Error when processing access management request.");

            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }

    public async Task<DelegationResponse> RevokeRights(DelegationRequest delegation, CancellationToken ct)
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

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(body, new MediaTypeHeaderValue("application/json")),
            };
            httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequestMessage.Headers.Add(
                "PlatformAccessToken",
                accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
            );

            httpResponseMessage = await httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
            DelegationResponse? response;
            if (!httpResponseMessage.IsSuccessStatusCode)
            {
                throw new HttpRequestException("Got error status code for access management request.");
            }

            response = JsonSerializer.Deserialize<DelegationResponse>(httpContent);
            if (response is null)
                throw new JsonException("Couldn't deserialize access management response.");
            return response;
        }
        catch (Exception e)
        {
            var ex =
                e is AccessManagementRequestException
                    ? e
                    : new AccessManagementRequestException(
                        $"Something went wrong when processing the access management request.",
                        null,
                        httpResponseMessage?.StatusCode,
                        httpContent,
                        e
                    );
            logger.LogError(ex, "Error when processing access management request.");

            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }
}
