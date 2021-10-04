using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Profile.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Services
{
    /// <inheritdoc/>
    public class UserProfileService : IUserProfileService
    {
        private readonly GeneralSettings _settings;
        private readonly HttpClient _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initialize a new instance of <see cref="UserProfileService"/> with settings for SBL Bridge endpoints.
        /// </summary>
        /// <param name="httpClient">Httpclient from httpclientfactory</param>
        /// <param name="settings">General settings for the authentication application</param>
        /// <param name="logger">A generic logger</param>
        public UserProfileService(HttpClient httpClient, IOptions<GeneralSettings> settings, ILogger<IUserProfileService> logger)
        {
            _client = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUser(string ssnOrExternalIdentity)
        {
            UserProfile user = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            Uri endpointUrl = new Uri($"{_settings.BridgeProfileApiEndpoint}users");
            StringContent requestBody = new StringContent(JsonSerializer.Serialize(ssnOrExternalIdentity), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _client.PostAsync(endpointUrl, requestBody);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                Stream stream = await response.Content.ReadAsStreamAsync();
                user = serializer.ReadObject(stream) as UserProfile;
            }
            else
            {
                _logger.LogError($"Getting user by SSN or external identity failed with statuscode {response.StatusCode} for url {endpointUrl}");
            }

            return user;
        }

        /// <summary>
        /// Method to create a new user based on identity
        /// </summary>
        /// <param name="user">The userprofile</param>
        /// <returns>The created users with userId and partyID</returns>
        public async Task<UserProfile> CreateUser(UserProfile user)
        {
            UserProfile createdProfile = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            Uri endpointUrl = new Uri($"{_settings.BridgeProfileApiEndpoint}users/create");
            StringContent requestBody = new StringContent(JsonSerializer.Serialize(user), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _client.PostAsync(endpointUrl, requestBody);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                Stream stream = await response.Content.ReadAsStreamAsync();
                createdProfile = serializer.ReadObject(stream) as UserProfile;
            }
            else
            {
                _logger.LogError($"Creating user failed for externalIdentity {user.ExternalIdentity} status {response.StatusCode} from {endpointUrl}");
            }

            return createdProfile;
        }
    }
}
