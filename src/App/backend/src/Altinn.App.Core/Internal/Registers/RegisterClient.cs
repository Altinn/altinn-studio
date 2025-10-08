using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Registers;

internal static class RegisterClientDI
{
    public static void AddRegisterClient(this IServiceCollection services) =>
        services.AddHttpClient<IRegisterClient, RegisterClient>();
}

/// <summary>
/// Client for the Register API
/// Contains methods that don't validate access to parties.
/// I.e. the requestor (token) can't necessarily represent returned/given parties,
/// So the methods should be used with caution
/// </summary>
internal interface IRegisterClient
{
    /// <summary>
    /// This API does not validate that the requestor (based on token)
    /// can represent the given/returned party. Use with caution
    /// </summary>
    /// <param name="partyId">Party ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns></returns>
    /// <exception cref="ServiceException"></exception>
    Task<Party?> GetPartyUnchecked(int partyId, CancellationToken cancellationToken);

    /// <summary>
    /// This API does not validate that the requestor (based on token)
    /// can represent the given/returned party. Use with caution
    /// </summary>
    /// <param name="partyIds">Party IDs</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns></returns>
    /// <exception cref="ServiceException"></exception>
    Task<IReadOnlyList<Party>> GetPartyListUnchecked(IReadOnlyList<int> partyIds, CancellationToken cancellationToken);
}

internal sealed class RegisterClient : IRegisterClient
{
    private readonly ILogger _logger;
    private readonly HttpClient _client;
    private readonly IAppMetadata _appMetadata;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    public RegisterClient(
        ILogger<RegisterClient> logger,
        IOptions<PlatformSettings> platformSettings,
        HttpClient client,
        IAppMetadata appMetadata,
        IUserTokenProvider userTokenProvider,
        IAccessTokenGenerator accessTokenGenerator,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        client.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
        client.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = client;
        _appMetadata = appMetadata;
        _userTokenProvider = userTokenProvider;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetry = telemetry;
    }

    public async Task<Party?> GetPartyUnchecked(int partyId, CancellationToken cancellationToken)
    {
        int[] partyIds = [partyId];
        var partyList = await GetPartyListUnchecked(partyIds, cancellationToken);
        return partyList.SingleOrDefault(p => p.PartyId == partyId);
    }

    public async Task<IReadOnlyList<Party>> GetPartyListUnchecked(
        IReadOnlyList<int> partyIds,
        CancellationToken cancellationToken
    )
    {
        using var activity = _telemetry?.StartGetPartyListForPartyIds(partyIds);

        string endpointUrl = $"parties/partylist?fetchSubUnits=true";
        string token = _userTokenProvider.GetUserToken();
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        var platformAccessToken = _accessTokenGenerator.GenerateAccessToken(
            application.Org,
            application.AppIdentifier.App
        );
        using var request = new HttpRequestMessage(HttpMethod.Post, endpointUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        request.Headers.Add(General.PlatformAccessTokenHeaderName, platformAccessToken);

        request.Content = new StringContent(JsonSerializer.Serialize(partyIds), Encoding.UTF8, "application/json");

        using var response = await _client.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await JsonSerializerPermissive.DeserializeAsync<IReadOnlyList<Party>>(
                    response.Content,
                    cancellationToken
                ) ?? [];
        }
        else if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }
        else
        {
            var errorMessage = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "Getting partylist from party IDs failed with statuscode {StatusCode} and error message: {ErrorMessage}",
                response.StatusCode,
                errorMessage
            );
            throw new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party");
        }
    }
}
