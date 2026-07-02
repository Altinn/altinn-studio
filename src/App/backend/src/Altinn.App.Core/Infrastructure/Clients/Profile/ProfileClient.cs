using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Profile.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Profile;

internal static class ProfileClientDI
{
    public static IServiceCollection AddProfileClient(this IServiceCollection services)
    {
        services.AddHttpClient<ProfileClient>();
        services.AddTransient<IProfileClient>(sp => new ProfileClientCachingDecorator(
            sp.GetRequiredService<ProfileClient>(),
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
    private readonly HttpClient _client;
    private readonly IServiceProvider _serviceProvider;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    // Resolved lazily to avoid circular dependency:
    // ProfileClient → IAuthenticationTokenResolver → AuthenticationContext → IProfileClient
    private IAuthenticationTokenResolver? _authTokenResolver;

    private IAuthenticationTokenResolver GetAuthTokenResolver() =>
        _authTokenResolver ??= _serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();

    /// <summary>
    /// Initializes a new instance of the <see cref="ProfileClient"/> class
    /// </summary>
    /// <param name="httpClient">A HttpClient provided by the HttpClientFactory.</param>
    /// <param name="serviceProvider">The service provider.</param>
    public ProfileClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _logger = serviceProvider.GetRequiredService<ILogger<ProfileClient>>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        httpClient.BaseAddress = new Uri(platformSettings.ApiProfileEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
    }

    /// <inheritdoc />
    public async Task<UserProfile?> GetUserProfile(int userId, StorageAuthenticationMethod? authenticationMethod = null)
    {
        using var activity = _telemetry?.StartGetUserProfileActivity(userId);
        UserProfile? userProfile = null;

        if (userId == default)
        {
            _logger.LogError("Tried to get user profile with 0 as user ID");
            return null;
        }

        string endpointUrl = $"users/{userId}";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);

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
    public async Task<UserProfile?> GetUserProfile(string ssn, StorageAuthenticationMethod? authenticationMethod = null)
    {
        using var activity = _telemetry?.StartGetUserProfileActivity();

        if (string.IsNullOrEmpty(ssn))
        {
            _logger.LogError("Tried to get user profile with empty SSN");
            return null;
        }

        string endpointUrl = "users";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);

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

    /// <inheritdoc />
    public async Task<UserProfile?> GetUserProfile(Guid userUuid)
    {
        using var activity = _telemetry?.StartGetUserProfileActivity();

        if (userUuid == Guid.Empty)
        {
            _logger.LogError("Tried to get user profile with empty party UUID");
            return null;
        }

        string endpointUrl = $"users/byuuid/{userUuid}";
        JwtToken token = await GetAuthTokenResolver().GetAccessToken(_defaultAuthenticationMethod);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        using HttpResponseMessage response = await _client.GetAsync(
            token,
            endpointUrl,
            _accessTokenGenerator.GenerateAccessToken(applicationMetadata.Org, applicationMetadata.AppIdentifier.App)
        );
        if (response.StatusCode == System.Net.HttpStatusCode.OK)
        {
            return await JsonSerializerPermissive.DeserializeAsync<UserProfile>(response.Content);
        }

        _logger.LogError(
            "Getting user profile with party UUID {PartyUuid} failed with statuscode {StatusCode}",
            userUuid,
            response.StatusCode
        );
        return null;
    }
}
