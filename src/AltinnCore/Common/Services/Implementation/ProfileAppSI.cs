using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Profile service for service development
    /// </summary>
    public class ProfileAppSI : IProfile
    {
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;
        private readonly HttpContext _httpContext;
        private readonly JwtCookieOptions _cookieOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContex">The http context </param>
        /// <param name="cookieOptions">The cookie options </param>
        public ProfileAppSI(
            ILogger<ProfileAppSI> logger,
            IOptions<PlatformSettings> platformSettings,
            HttpContext httpContex,
            IOptions<JwtCookieOptions> cookieOptions)
        {
            _logger = logger;
            _platformSettings = platformSettings.Value;
            _httpContext = httpContex;
            _cookieOptions = cookieOptions.Value;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            UserProfile userProfile = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            Uri endpointUrl = new Uri($"{_platformSettings.GetApiProfileEndpointHost}users/{userId}");
            string token = JwtTokenUtil.GetTokenFromContext(_httpContext, _cookieOptions.Cookie.Name);

            using (HttpClient client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    userProfile = await response.Content.ReadAsAsync<UserProfile>();
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
