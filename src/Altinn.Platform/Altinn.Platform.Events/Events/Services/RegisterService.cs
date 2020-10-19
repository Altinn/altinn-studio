using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Exceptions;
using Altinn.Platform.Events.Extensions;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Handles register service
    /// </summary>
    public class RegisterService : IRegisterService
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly ILogger<IRegisterService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterService"/> class.
        /// </summary>
        public RegisterService(
            HttpClient httpClient,
            IHttpContextAccessor httpContextAccessor,
            IAccessTokenGenerator accessTokenGenerator,
            IOptions<GeneralSettings> generalSettings,
            IOptions<PlatformSettings> platformSettings,
            ILogger<IRegisterService> logger)
        {
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _accessTokenGenerator = accessTokenGenerator;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<int> PartyLookup(string orgNo, string person)
        {
            string endpointUrl = "parties/lookup";

            PartyLookup partyLookup = new PartyLookup() { Ssn = person, OrgNo = orgNo };

            string bearerToken = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _generalSettings.JwtCookieName);
            string accessToken = _accessTokenGenerator.GenerateAccessToken("platform", "events");

            StringContent content = new StringContent(JsonSerializer.Serialize(partyLookup));
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpResponseMessage response = await _client.PostAsync(bearerToken, endpointUrl, content, accessToken);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                Party party = await response.Content.ReadAsAsync<Party>();
                return party.PartyId;
            }
            else
            {
                string reason = await response.Content.ReadAsStringAsync();
                _logger.LogError($"// RegisterService // PartyLookup // Failed to lookup party in platform register. Response {response}. \n Reason {reason}.");

                throw await PlatformHttpException.CreateAsync(response);
            }
        }
    }
}
