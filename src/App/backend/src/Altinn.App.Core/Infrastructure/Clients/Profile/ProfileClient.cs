using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Profile;

internal static class ProfileClientDI
{
    public static IServiceCollection AddProfileClient(this IServiceCollection services)
    {
        services.AddTransient<IProfileClient>(sp => new ProfileClientCachingDecorator(
            ActivatorUtilities.CreateInstance<ProfileClient>(sp),
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<IOptions<CacheSettings>>()
        ));
        return services;
    }
}

/// <summary>
/// A client for retrieving profiles from Altinn Platform.
/// </summary>
public class ProfileClient : IProfileClient
{
    private readonly ILogger _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppSettings _settings;
    private readonly HttpClient _client;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProfileClient"/> class
    /// </summary>
    /// <param name="logger">the logger</param>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="httpContextAccessor">The http context accessor </param>
    /// <param name="settings">The application settings.</param>
    /// <param name="httpClient">A HttpClient provided by the HttpClientFactory.</param>
    /// <param name="appMetadata">An instance of the IAppMetadata service.</param>
    /// <param name="accessTokenGenerator">An instance of the AccessTokenGenerator service.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public ProfileClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<ProfileClient> logger,
        IHttpContextAccessor httpContextAccessor,
        IOptionsMonitor<AppSettings> settings,
        HttpClient httpClient,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _settings = settings.CurrentValue;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiProfileEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<UserProfile?> GetUserProfile(int userId)
    {
        using var activity = _telemetry?.StartGetUserProfileActivity(userId);
        UserProfile? userProfile = null;

        if (userId == default)
        {
            _logger.LogError("Tried to get user profile with 0 as user ID");
            return null;
        }

        string endpointUrl = $"users/{userId}";
        string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        HttpResponseMessage response = await _client.GetAsync(
            token,
            endpointUrl,
            _accessTokenGenerator.GenerateAccessToken(applicationMetadata.Org, applicationMetadata.AppIdentifier.App)
        );
        if (response.StatusCode == System.Net.HttpStatusCode.OK)
        {
            userProfile = await JsonSerializerPermissive.DeserializeAsync<UserProfile>(response.Content);
        }
        else
        {
            _logger.LogError(
                "Getting user profile with userId {UserId} failed with statuscode {StatusCode}",
                userId,
                response.StatusCode
            );
        }

        return userProfile;
    }

    /// <inheritdoc />
    public async Task<UserProfile?> GetUserProfile(string ssn)
    {
        using var activity = _telemetry?.StartGetUserProfileActivity();

        if (string.IsNullOrEmpty(ssn))
        {
            _logger.LogError("Tried to get user profile with empty SSN");
            return null;
        }

        string endpointUrl = "users";
        string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        StringContent content = new(JsonSerializer.Serialize(ssn), Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PostAsync(
            token,
            endpointUrl,
            content,
            _accessTokenGenerator.GenerateAccessToken(applicationMetadata.Org, applicationMetadata.AppIdentifier.App)
        );

        UserProfile? userProfile = null;

        if (response.StatusCode == System.Net.HttpStatusCode.OK)
        {
            userProfile = await JsonSerializerPermissive.DeserializeAsync<UserProfile>(response.Content);
        }
        else
        {
            _logger.LogError("Getting user profile with SSN failed with statuscode {StatusCode}", response.StatusCode);
        }

        return userProfile;
    }
}
