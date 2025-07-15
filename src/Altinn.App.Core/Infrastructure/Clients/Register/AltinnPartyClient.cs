using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Register;

/// <summary>
/// A client for retrieving register data from Altinn Platform.
/// </summary>
public class AltinnPartyClient : IAltinnPartyClient
{
    private readonly ILogger _logger;
    private readonly HttpClient _client;
    private readonly IAppMetadata _appMetadata;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnPartyClient"/> class
    /// </summary>
    /// <param name="platformSettings">The current platform settings.</param>
    /// <param name="logger">The logger</param>
    /// <param name="httpClient">The http client</param>
    /// <param name="appMetadata">The app metadata service</param>
    /// <param name="userTokenProvider">The user token provider</param>
    /// <param name="accessTokenGenerator">The platform access token generator</param>
    /// <param name="telemetry">Telemetry for metrics and traces.</param>
    public AltinnPartyClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<AltinnPartyClient> logger,
        HttpClient httpClient,
        IAppMetadata appMetadata,
        IUserTokenProvider userTokenProvider,
        IAccessTokenGenerator accessTokenGenerator,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
        _appMetadata = appMetadata;
        _userTokenProvider = userTokenProvider;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<Party?> GetParty(int partyId)
    {
        using var activity = _telemetry?.StartGetPartyActivity(partyId);
        Party? party = null;

        string endpointUrl = $"parties/{partyId}";
        string token = _userTokenProvider.GetUserToken();
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        HttpResponseMessage response = await _client.GetAsync(
            token,
            endpointUrl,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );
        if (response.StatusCode == HttpStatusCode.OK)
        {
            party = await JsonSerializerPermissive.DeserializeAsync<Party>(response.Content);
        }
        else if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            throw new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party");
        }
        else
        {
            _logger.LogError(
                "// Getting party with partyID {PartyId} failed with statuscode {StatusCode}",
                partyId,
                response.StatusCode
            );
        }

        return party;
    }

    /// <inheritdoc/>
    public async Task<Party> LookupParty(PartyLookup partyLookup)
    {
        using var activity = _telemetry?.StartLookupPartyActivity();
        Party party;

        string endpointUrl = "parties/lookup";
        string token = _userTokenProvider.GetUserToken();

        StringContent content = new StringContent(JsonSerializerPermissive.Serialize(partyLookup));
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
        HttpRequestMessage request = new HttpRequestMessage
        {
            RequestUri = new Uri(endpointUrl, UriKind.Relative),
            Method = HttpMethod.Post,
            Content = content,
        };

        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        request.Headers.Add(
            General.PlatformAccessTokenHeaderName,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );

        HttpResponseMessage response = await _client.SendAsync(request);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            party = await JsonSerializerPermissive.DeserializeAsync<Party>(response.Content);
        }
        else
        {
            string reason = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "// Getting party with orgNo: {OrgNo} or ssn: {Ssn} failed with statuscode {StatusCode} - {Reason}",
                partyLookup.OrgNo,
                partyLookup.Ssn,
                response.StatusCode,
                reason
            );

            throw await PlatformHttpException.CreateAsync(response);
        }

        return party;
    }
}
