using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using IRegister = Altinn.App.Services.Interface.IRegister;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// A client for retrieving register data from Altinn Platform.
    /// </summary>
    public class RegisterClient : IRegister
    {
        private readonly IDSF _dsfClient;
        private readonly IER _erClient;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;
        private readonly IAppResources _appResources;
        private readonly IAccessTokenGenerator _accessTokenGenerator;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterClient"/> class
        /// </summary>
        /// <param name="platformSettings">The current platform settings.</param>
        /// <param name="dsf">The dsf</param>
        /// <param name="er">The er</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClient">The http client</param>
        /// <param name="appResources">The app resources service</param>
        /// <param name="accessTokenGenerator">The platform access token generator</param>
        public RegisterClient(
            IOptions<PlatformSettings> platformSettings,
            IDSF dsf,
            IER er,
            ILogger<RegisterClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient,
            IAppResources appResources,
            IAccessTokenGenerator accessTokenGenerator)
        {
            _dsfClient = dsf;
            _erClient = er;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _appResources = appResources;
            _accessTokenGenerator = accessTokenGenerator;
        }

        /// <summary>
        /// The access to the dsf component through register services
        /// </summary>
        public IDSF DSF
        {
            get { return _dsfClient; }
        }

        /// <summary>
        /// The access to the er component through register services
        /// </summary>
        public IER ER
        {
            get { return _erClient; }
        }

        /// <inheritdoc/>
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;

            string endpointUrl = $"parties/{partyId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, _accessTokenGenerator.GenerateAccessToken(_appResources.GetApplication().Org, _appResources.GetApplication().Id.Split("/")[1]));
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                 throw new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party");
            }
            else
            {
                _logger.LogError($"// Getting party with partyID {partyId} failed with statuscode {response.StatusCode}");
            }

            return party;
        }

        /// <inheritdoc/>
        public async Task<Party> LookupParty(PartyLookup partyLookup)
        {
            Party party;

            string endpointUrl = "parties/lookup";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            StringContent content = new StringContent(JsonConvert.SerializeObject(partyLookup));
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
            HttpRequestMessage request = new HttpRequestMessage
            {
                RequestUri = new System.Uri(endpointUrl, System.UriKind.Relative),
                Method = HttpMethod.Post,
                Content = content
            };

            request.Headers.Add("Authorization", "Bearer " + token);
            request.Headers.Add("PlatformAccessToken", _accessTokenGenerator.GenerateAccessToken(_appResources.GetApplication().Org, _appResources.GetApplication().Id.Split("/")[1]));

            HttpResponseMessage response = await _client.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else
            {
                string reason = await response.Content.ReadAsStringAsync();
                _logger.LogError($"// Getting party with orgNo: {partyLookup.OrgNo} or ssn: {partyLookup.Ssn} failed with statuscode {response.StatusCode} - {reason}");

                throw await PlatformHttpException.CreateAsync(response);
            }

            return party;
        }
    }
}
