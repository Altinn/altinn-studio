using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Register;

/// <summary>
/// A client for retrieving ER data from Altinn Platform.
/// </summary>
public class RegisterERClient : IOrganizationClient
{
    private readonly ILogger _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppSettings _settings;
    private readonly HttpClient _client;
    private readonly IAppMetadata _appMetadata;
    private readonly Telemetry? _telemetry;
    private readonly IAccessTokenGenerator _accessTokenGenerator;

    /// <summary>
    /// Initializes a new instance of the <see cref="RegisterERClient"/> class
    /// </summary>
    /// <param name="logger">the logger</param>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="httpContextAccessor">The http context accessor </param>
    /// <param name="settings">The app settings</param>
    /// <param name="httpClient">The http client</param>
    /// <param name="accessTokenGenerator">The platform access token generator</param>
    /// <param name="appMetadata">The app metadata service</param>
    /// <param name="telemetry">Telemetry for metrics and traces.</param>
    public RegisterERClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<RegisterERClient> logger,
        IHttpContextAccessor httpContextAccessor,
        IOptionsMonitor<AppSettings> settings,
        HttpClient httpClient,
        IAccessTokenGenerator accessTokenGenerator,
        IAppMetadata appMetadata,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _settings = settings.CurrentValue;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
        _accessTokenGenerator = accessTokenGenerator;
        _appMetadata = appMetadata;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<Organization?> GetOrganization(string OrgNr)
    {
        using var activity = _telemetry?.StartGetOrganizationActivity(OrgNr);
        Organization? organization = null;

        string endpointUrl = $"organizations/{OrgNr}";
        string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        HttpResponseMessage response = await _client.GetAsync(
            token,
            endpointUrl,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );

        if (response.StatusCode == System.Net.HttpStatusCode.OK)
        {
            organization = await JsonSerializerPermissive.DeserializeAsync<Organization>(response.Content);
        }
        else
        {
            _logger.LogError(
                "Getting organisation with orgnr {OrgNr} failed with statuscode {StatusCode}",
                OrgNr,
                response.StatusCode
            );
        }

        return organization;
    }
}
