using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Helpers;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Register service
    /// </summary>
    public class RegisterService : IRegisterService
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger<IRegisterService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterService"/> class.
        /// </summary>
        /// <param name="httpClient">http client</param>
        public RegisterService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IOptions<GeneralSettings> generalSettings, IOptions<PlatformSettings> platformSettings, ILogger<IRegisterService> logger)
        {
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<int> PartyLookup(string orgNo, string person)
        {
            string endpointUrl = "parties/lookup";

            PartyLookup partyLookup = new PartyLookup() { Ssn = person, OrgNo = orgNo };

            string bearerToken = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _generalSettings.JwtCookieName);
            string accessToken = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _generalSettings.AccessTokenName);

            StringContent content = new StringContent(JsonSerializer.Serialize(partyLookup));
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
            HttpRequestMessage request = new HttpRequestMessage
            {
                RequestUri = new Uri(endpointUrl, UriKind.Relative),
                Method = HttpMethod.Post,
                Content = content
            };

            request.Headers.Add("Authorization", "Bearer " + bearerToken);
            request.Headers.Add("PlatformAccessToken", accessToken);

            HttpResponseMessage response = await _client.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                Party party = await response.Content.ReadAsAsync<Party>();
                return party.PartyId;
            }
            else
            {
                string reason = await response.Content.ReadAsStringAsync();

                _logger.LogError($"// RegisterService // PartyLookup // Failed to lookup party in platform register. Reason {reason}.");
                throw await PlatformHttpException.CreateAsync(response);
            }
        }
    }
}
