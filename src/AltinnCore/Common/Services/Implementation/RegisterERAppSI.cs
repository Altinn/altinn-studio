using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
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
    /// <inheritdoc />
    public class RegisterERAppSI : IER
    {
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;
        private readonly HttpContext _httpContext;
        private readonly JwtCookieOptions _cookieOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterERAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContex">The http context </param>
        /// <param name="cookieOptions">The cookie options </param>
        public RegisterERAppSI(
            ILogger<RegisterERAppSI> logger,
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
        public async Task<Organization> GetOrganization(string OrgNr)
        {
            Organization organization = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Organization));

            Uri endpointUrl = new Uri($"{_platformSettings.GetApiRegisterEndpoint}organizations/{OrgNr}");
            string token = JwtTokenUtil.GetTokenFromContext(_httpContext, _cookieOptions.Cookie.Name);

            using (HttpClient client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    organization = await response.Content.ReadAsAsync<Organization>();
                }
                else
                {
                    _logger.LogError($"Getting organization with orgnr {OrgNr} failed with statuscode {response.StatusCode}");
                }
            }

            return organization;
        }
    }
}
