using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the authorization service where the app uses the Altinn platform api.
    /// </summary>
    public class AuthorizationAppSI : IAuthorization
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _authClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationAppSI"/> class
        /// </summary>
        /// <param name="platformSettings">The platform settings from configuration.</param>
        /// <param name="httpContextAccessor">the http context accessor.</param>
        /// <param name="httpClient">A Http client from the HttpClientFactory.</param>
        /// <param name="settings">The application settings.</param>
        /// <param name="logger">the handler for logger service</param>
        public AuthorizationAppSI(
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IOptionsMonitor<AppSettings> settings,
            ILogger<AuthorizationAppSI> logger)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _logger = logger;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiAuthorizationEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _authClient = httpClient;
        }

        /// <inheritdoc />
        public async Task<List<Party>> GetPartyList(int userId)
        {
            List<Party> partyList = null;
            string apiUrl = $"parties?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            try
            {
                HttpResponseMessage response = await _authClient.GetAsync(token, apiUrl);

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string partyListData = await response.Content.ReadAsStringAsync();
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
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _authClient.GetAsync(token, apiUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string responseData = await response.Content.ReadAsStringAsync();
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
