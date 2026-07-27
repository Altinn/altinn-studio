using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
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
using Microsoft.Extensions.DependencyInjection;
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
    private readonly IServiceProvider _serviceProvider;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    // Resolved lazily to avoid circular dependency:
    // AltinnPartyClient → IAuthenticationTokenResolver → AuthenticationContext → IAltinnPartyClient
    private IAuthenticationTokenResolver? _authTokenResolver;

    private IAuthenticationTokenResolver GetAuthTokenResolver() =>
        _authTokenResolver ??= _serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();

    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnPartyClient"/> class
    /// </summary>
    /// <param name="httpClient">The http client</param>
    /// <param name="serviceProvider">The service provider.</param>
    public AltinnPartyClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _logger = serviceProvider.GetRequiredService<ILogger<AltinnPartyClient>>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        _client = httpClient;
        _client.BaseAddress = new Uri(platformSettings.ApiRegisterEndpoint);
        _client.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <inheritdoc/>
    public async Task<Party?> GetParty(int partyId, StorageAuthenticationMethod? authenticationMethod = null)
    {
        using var activity = _telemetry?.StartGetPartyActivity(partyId);

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        string endpointUrl = $"parties/{partyId}";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);

        using HttpResponseMessage response = await _client.GetAsync(
            token,
            endpointUrl,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );

        Party? party = response.StatusCode switch
        {
            HttpStatusCode.OK => await JsonSerializerPermissive.DeserializeAsync<Party>(response.Content),
            HttpStatusCode.Unauthorized => throw new ServiceException(
                HttpStatusCode.Unauthorized,
                "Unauthorized for party"
            ),
            _ => null,
        };

        if (party is null)
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
    public async Task<Party> LookupParty(
        PartyLookup partyLookup,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        using var activity = _telemetry?.StartLookupPartyActivity();

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        string endpointUrl = "parties/lookup";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);

        using StringContent content = new(JsonSerializerPermissive.Serialize(partyLookup));
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
        HttpResponseMessage response = await _client.PostAsync(
            token,
            endpointUrl,
            content,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await JsonSerializerPermissive.DeserializeAsync<Party>(response.Content);
        }

        _logger.LogError(
            "// Getting party with orgNo: {OrgNo} or ssn: {Ssn} failed with statuscode {StatusCode} - {Reason}",
            partyLookup.OrgNo,
            partyLookup.Ssn,
            response.StatusCode,
            await response.Content.ReadAsStringAsync()
        );

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<int?> GetPartyIdByUrn(string urn)
    {
        using var activity = _telemetry?.StartLookupPartyActivity();
        string endpointUrl = "apps/parties/query?fields=id,user.id";
        var query = new { data = new string[] { urn } };
        using var content = new StringContent(JsonSerializer.Serialize(query));
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        JwtToken token = await GetAuthTokenResolver().GetAccessToken(_defaultAuthenticationMethod);

        using HttpResponseMessage response = await _client.PostAsync(
            token,
            endpointUrl,
            content,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );
        if (response.StatusCode != HttpStatusCode.OK)
        {
            _logger.LogError(
                "// Getting partyId by URN {Urn} failed with statuscode {StatusCode} - {Reason}",
                urn,
                response.StatusCode,
                await response.Content.ReadAsStringAsync()
            );
            throw await PlatformHttpException.CreateAsync(response);
        }

        using var responseDocument = JsonDocument.Parse(await response.Content.ReadAsByteArrayAsync());
        var listResponse = responseDocument.RootElement.GetProperty("data");
        if (listResponse.GetArrayLength() == 0)
        {
            return null;
        }
        if (listResponse.GetArrayLength() > 1)
        {
            throw new InvalidOperationException($"Multiple parties found for URN {urn}");
        }

        var partyId = listResponse[0].GetProperty("partyId").GetInt32();
        return partyId;
    }

    /// <inheritdoc/>
    public async Task<Guid?> GetPartyUuidByUrn(string urn)
    {
        using var activity = _telemetry?.StartLookupPartyActivity();
        string endpointUrl = "access-management/parties/query";
        var query = new { data = new string[] { urn } };
        using var content = new StringContent(JsonSerializer.Serialize(query));
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        JwtToken token = await GetAuthTokenResolver().GetAccessToken(_defaultAuthenticationMethod);

        using HttpResponseMessage response = await _client.PostAsync(
            token,
            endpointUrl,
            content,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );
        if (response.StatusCode != HttpStatusCode.OK)
        {
            _logger.LogError(
                "// Getting partyUuid by URN {Urn} failed with statuscode {StatusCode} - {Reason}",
                urn,
                response.StatusCode,
                await response.Content.ReadAsStringAsync()
            );
            throw await PlatformHttpException.CreateAsync(response);
        }

        using var responseDocument = JsonDocument.Parse(await response.Content.ReadAsByteArrayAsync());
        var listResponse = responseDocument.RootElement.GetProperty("data");
        if (listResponse.GetArrayLength() == 0)
        {
            return null;
        }
        if (listResponse.GetArrayLength() > 1)
        {
            throw new InvalidOperationException($"Multiple parties found for URN {urn}");
        }

        var partyUuid = listResponse[0].GetProperty("partyUuid").GetGuid();
        return partyUuid;
    }
}
