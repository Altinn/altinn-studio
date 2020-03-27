using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
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
    /// App implementation of the register service, for app development. Calls the platform register service.
    /// </summary>
    public class RegisterAppSI : IRegister
    {
        private readonly IDSF _dsf;
        private readonly IER _er;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterAppSI"/> class
        /// </summary>
        /// <param name="dsf">The dsf</param>
        /// <param name="er">The er</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public RegisterAppSI(
            IDSF dsf,
            IER er,
            ILogger<RegisterAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            IHttpClientAccessor httpClientAccessor)
        {
            _dsf = dsf;
            _er = er;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _client = httpClientAccessor.RegisterClient;
        }

        /// <summary>
        /// The access to the dsf component through register services
        /// </summary>
        public IDSF DSF
        {
            get { return _dsf; }
        }

        /// <summary>
        /// The access to the er component through register services
        /// </summary>
        public IER ER
        {
            get { return _er; }
        }

        /// <inheritdoc/>
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;

            string endpointUrl = $"parties/{partyId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(endpointUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else
            {
                _logger.LogError($"// Getting party with partyID {partyId} failed with statuscode {response.StatusCode}");
            }

            return party;
        }

        /// <inheritdoc/>
        public async Task<Party> LookupParty(string personOrOrganisationNumber)
        {
            Party party;

            string endpointUrl = "parties/lookupObject";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            StringContent content = new StringContent(JsonConvert.SerializeObject(personOrOrganisationNumber));
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
            HttpRequestMessage request = new HttpRequestMessage
            {
                RequestUri = new System.Uri(endpointUrl, System.UriKind.Relative),
                Method = HttpMethod.Get,
                Content = content,
            };            

            HttpResponseMessage response = await _client.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();               
            }
            else
            {
                string reason = await response.Content.ReadAsStringAsync();
                _logger.LogError($"// Getting party with personOrOrganisationNumber {personOrOrganisationNumber} failed with statuscode {response.StatusCode} - {reason}");

                throw await PlatformHttpException.CreateAsync(response);
            }

            return party;            
        }
    }
}
