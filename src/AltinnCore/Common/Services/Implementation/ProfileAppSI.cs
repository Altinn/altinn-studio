using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Profile service for service development
    /// </summary>
    public class ProfileAppSI : IProfile
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        public ProfileAppSI(ILogger<ProfileAppSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            UserProfile userProfile = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            // TODO: add path to platform to settingsfile
            Uri endpointUrl = new Uri($"http://platform.altinn.cloud/api/v1/persons/{userId}");
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    userProfile = serializer.ReadObject(stream) as UserProfile;
                }
                else
                {
                    _logger.LogError($"Getting user profile with userId {userId} failed with statuscode {response.StatusCode}");
                }
            }

            return userProfile;
        }
    }
}
