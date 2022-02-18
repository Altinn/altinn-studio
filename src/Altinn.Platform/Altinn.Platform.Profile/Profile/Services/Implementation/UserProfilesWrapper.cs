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
        private readonly HttpClient _client;
        private readonly JsonSerializerOptions _serializerOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserProfilesWrapper"/> class
        /// </summary>
        /// <param name="httpClient">HttpClient from default http client factory</param>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">the general settings</param>
        public UserProfilesWrapper(
            HttpClient httpClient,
            ILogger<UserProfilesWrapper> logger,
            IOptions<GeneralSettings> generalSettings)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _client = httpClient;

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
            UserProfile user;

            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}users/{userId}");

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Getting user {userId} failed with {statusCode}", userId, response.StatusCode);
                return null;
            }

            string content = await response.Content.ReadAsStringAsync();
            user = JsonSerializer.Deserialize<UserProfile>(content, _serializerOptions);

            return user;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(string ssn)
        {
            UserProfile user;
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

            return user;
        }
    }
}
