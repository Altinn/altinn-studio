using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Helpers;
using Altinn.Platform.Profile.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Profile.Services.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class UserProfilesWrapper : IUserProfiles
    {
        private readonly ILogger _logger;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserProfilesWrapper"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">the general settings</param>
        public UserProfilesWrapper(ILogger<UserProfilesWrapper> logger, IOptions<GeneralSettings> generalSettings)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            UserProfile user = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));
            Uri endpointUrl = new Uri($"{_generalSettings.GetApiBaseUrl()}users/{userId}");
            using (HttpClient client = HttpApiHelper.GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    user = serializer.ReadObject(stream) as UserProfile;
                }
                else
                {
                    _logger.LogError($"Getting user with user id {userId} failed with statuscode {response.StatusCode}");
                }
            }

            return user;
        }
    }
}
