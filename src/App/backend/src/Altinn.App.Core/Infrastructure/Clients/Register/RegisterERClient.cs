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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Register;

/// <summary>
/// A client for retrieving ER data from Altinn Platform.
/// </summary>
public class RegisterERClient : IOrganizationClient
{
    private readonly ILogger _logger;
    private readonly HttpClient _client;
    private readonly IAppMetadata _appMetadata;
    private readonly Telemetry? _telemetry;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Initializes a new instance of the <see cref="RegisterERClient"/> class
    /// </summary>
    /// <param name="httpClient">The http client</param>
    /// <param name="serviceProvider">The service provider.</param>
    public RegisterERClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _logger = serviceProvider.GetRequiredService<ILogger<RegisterERClient>>();
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        httpClient.BaseAddress = new Uri(platformSettings.ApiRegisterEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
    }

    /// <inheritdoc />
    public async Task<Organization?> GetOrganization(
        string OrgNr,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        using var activity = _telemetry?.StartGetOrganizationActivity(OrgNr);
        Organization? organization = null;

        string endpointUrl = $"organizations/{OrgNr}";
        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod
        );

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
