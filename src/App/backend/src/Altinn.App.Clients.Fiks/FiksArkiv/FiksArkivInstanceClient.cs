using System.Net.Http.Headers;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivInstanceClient : IFiksArkivInstanceClient
{
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly Telemetry? _telemetry;
    private readonly PlatformSettings _platformSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly ILogger<FiksArkivInstanceClient> _logger;

    private readonly AuthenticationMethod _serviceOwnerAuth = AuthenticationMethod.ServiceOwner();

    public FiksArkivInstanceClient(
        IOptions<PlatformSettings> platformSettings,
        IAuthenticationTokenResolver authenticationTokenResolver,
        IHttpClientFactory httpClientFactory,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        ILogger<FiksArkivInstanceClient> logger,
        Telemetry? telemetry = null
    )
    {
        _platformSettings = platformSettings.Value;
        _telemetry = telemetry;
        _authenticationTokenResolver = authenticationTokenResolver;
        _httpClientFactory = httpClientFactory;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _authenticationTokenResolver.GetAccessToken(_serviceOwnerAuth, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Failed to retrieve service owner token for FiksArkivInstanceClient: {Error}",
                e.Message
            );
            throw new FiksArkivException($"Error retrieving service owner token: {e.Message}", e);
        }
    }

    /// <inheritdoc />
    public async Task MarkInstanceComplete(
        InstanceIdentifier instanceIdentifier,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartApiProcessCompleteActivity(instanceIdentifier);

        try
        {
            using HttpClient client = await GetAuthenticatedStorageClient(cancellationToken);
            using StringContent payload = new(string.Empty);
            using HttpResponseMessage response = await client.PostAsync(
                $"instances/{instanceIdentifier}/complete",
                payload,
                cancellationToken
            );

            await EnsureSuccessStatusCode(response, cancellationToken);

            _logger.LogInformation("Marked {InstanceId} as completed.", instanceIdentifier);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to mark instance {InstanceId} as completed: {Error}", instanceIdentifier, e);
            throw;
        }
    }

    private static async Task EnsureSuccessStatusCode(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
            return;

        string content = await response.Content.ReadAsStringAsync(cancellationToken);
        string errorMessage = $"{(int)response.StatusCode} {response.ReasonPhrase}: {content}";
        throw await PlatformHttpException.Create(response, errorMessage, cancellationToken: cancellationToken);
    }

    private async Task<HttpClient> GetAuthenticatedStorageClient(CancellationToken cancellationToken)
    {
        ApplicationMetadata appMetadata = _appMetadata.ApplicationMetadata;

        HttpClient client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(_platformSettings.ApiStorageEndpoint);
        client.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            await GetServiceOwnerToken(cancellationToken)
        );
        client.DefaultRequestHeaders.Add(
            General.PlatformAccessTokenHeaderName,
            _accessTokenGenerator.GenerateAccessToken(appMetadata.AppIdentifier.Org, appMetadata.AppIdentifier.App)
        );

        return client;
    }
}
