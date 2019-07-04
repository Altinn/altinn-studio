using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for authorization service where the app uses the altinn platform api
    /// </summary>
    public class AuthorizationAppSI : IAuthorization
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationAppSI"/> class
        /// </summary>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="httpClientAccessor"'>The Http client accessor</param>
        /// <param name="cookieOptions">the default cookie options</param>
        /// <param name="logger">the handler for logger service</param>
        public AuthorizationAppSI(
                IHttpContextAccessor httpContextAccessor,
                IHttpClientAccessor httpClientAccessor,
                IOptions<JwtCookieOptions> cookieOptions,
                ILogger<AuthorizationAppSI> logger)
        {            
            _httpContextAccessor = httpContextAccessor;
            _client = httpClientAccessor.AuthorizationClient;
            _cookieOptions = cookieOptions.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public List<Party> GetPartyList(int userId)
        {
            List<Party> partyList = null;
            string apiUrl = $"parties?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            try
            {
                HttpResponseMessage response = _client.PostAsync(apiUrl, null).Result;

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string partyListData = response.Content.ReadAsStringAsync().Result;
                    partyList = JsonConvert.DeserializeObject<List<Party>>(partyListData);
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return partyList;
                }
                else
                {
                    _logger.LogError("Unable to fetch party list");
                }

                return null;
            }
            catch
            {
                return partyList;
            }
        }
    }
}
