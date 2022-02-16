using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Interfaces;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Profile.Services.Implementation
{
    /// <summary>
    /// Represents an implementation of <see cref="IUserProfiles"/> using SBLBridge to obtain profile information.
    /// </summary>
    public class UserProfilesWrapper : IUserProfiles
    {
        private readonly ILogger _logger;
        private readonly GeneralSettings _generalSettings;
        private readonly IMemoryCache _memoryCache;
        private readonly HttpClient _client;
        private readonly MemoryCacheEntryOptions _cacheOptions;
        private readonly JsonSerializerOptions _serializerOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserProfilesWrapper"/> class
        /// </summary>
        /// <param name="httpClient">HttpClient from default http client factory</param>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="memoryCache">the memory cache</param>
        public UserProfilesWrapper(
            HttpClient httpClient,
            ILogger<UserProfilesWrapper> logger,
            IOptions<GeneralSettings> generalSettings,
            IMemoryCache memoryCache)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _client = httpClient;
            _memoryCache = memoryCache;
            _cacheOptions = new()
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_generalSettings.ProfileCacheLifetimeSeconds)
            };

            _serializerOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }               
            };

    }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            string uniqueCacheKey = "User_UserId_" + userId;

            if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile user))
            {
                return user;
            }

            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}users/{userId}");

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Getting user {userId} failed with {statusCode}", userId, response.StatusCode);
                return null;
            }

            string content = await response.Content.ReadAsStringAsync();
            user = JsonSerializer.Deserialize<UserProfile>(content, _serializerOptions);

            _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);

            return user;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(string ssn)
        {
            string uniqueCacheKey = "User_SSN_" + ssn;

            if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile user))
            {
                return user;
            }

            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}users");
            StringContent requestBody = new StringContent(JsonSerializer.Serialize(ssn), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _client.PostAsync(endpointUrl, requestBody);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Getting user by SSN failed with statuscode {statusCode}", response.StatusCode);
                return null;
            }

            string content = await response.Content.ReadAsStringAsync();
            user = JsonSerializer.Deserialize<UserProfile>(content, _serializerOptions);

            _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);

            return user;
        }
    }
}
