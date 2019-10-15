using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
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
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterERAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public RegisterERAppSI(
            ILogger<RegisterERAppSI> logger,
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _platformSettings = platformSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.RegisterClient;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string OrgNr)
        {
            Organization organization = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Organization));

            string endpointUrl = $"organizations/{OrgNr}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                organization = await response.Content.ReadAsAsync<Organization>();
            }
            else
            {
                _logger.LogError($"Getting organisation with orgnr {OrgNr} failed with statuscode {response.StatusCode}");
            }

            return organization;
        }
    }
}
