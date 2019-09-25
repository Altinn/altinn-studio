using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// App implementation of the authorization service where the app uses the Altinn platform api.
    /// </summary>
    public class AuthorizationAppSI : IAuthorization
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _authClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationAppSI"/> class
        /// </summary>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="httpClientAccessor">The Http client accessor</param>
        /// <param name="cookieOptions">the default cookie options</param>
        /// <param name="logger">the handler for logger service</param>
        public AuthorizationAppSI(
                IHttpContextAccessor httpContextAccessor,
                IHttpClientAccessor httpClientAccessor,
                IOptions<JwtCookieOptions> cookieOptions,
                ILogger<AuthorizationAppSI> logger)
        {
            _httpContextAccessor = httpContextAccessor;
            _authClient = httpClientAccessor.AuthorizationClient;
            _cookieOptions = cookieOptions.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public List<Party> GetPartyList(int userId)
        {
            List<Party> partyList = null;
            string apiUrl = $"parties?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_authClient, token);
            try
            {
                HttpResponseMessage response = _authClient.GetAsync(apiUrl).Result;

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string partyListData = response.Content.ReadAsStringAsync().Result;
                    partyList = JsonConvert.DeserializeObject<List<Party>>(partyListData);
                }
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to retrieve party list. An error occured {e.Message}");
            }

            return partyList;
        }

        /// <inheritdoc />
        public async Task<bool?> ValidateSelectedParty(int userId, int partyId)
        {
            bool? result;
            string apiUrl = $"parties/{partyId}/validate?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_authClient, token);

            HttpResponseMessage response = await _authClient.GetAsync(apiUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string responseData = response.Content.ReadAsStringAsync().Result;
                result = JsonConvert.DeserializeObject<bool>(responseData);
            }
            else
            {
                _logger.LogError($"Validating selected party {partyId} for user {userId} failed with statuscode {response.StatusCode}");
                result = null;
            }

            return result;
        }
    }
}
