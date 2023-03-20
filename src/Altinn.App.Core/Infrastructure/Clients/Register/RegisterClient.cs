using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Register
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
        private readonly IAppMetadata _appMetadata;
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
        /// <param name="appMetadata">The app metadata service</param>
        /// <param name="accessTokenGenerator">The platform access token generator</param>
        public RegisterClient(
            IOptions<PlatformSettings> platformSettings,
            IDSF dsf,
            IER er,
            ILogger<RegisterClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient,
            IAppMetadata appMetadata,
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
            _appMetadata = appMetadata;
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
            Party? party = null;

            string endpointUrl = $"parties/{partyId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App));
            if (response.StatusCode == HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                throw new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party");
            }
            else
            {
                _logger.LogError("// Getting party with partyID {PartyId} failed with statuscode {StatusCode}", partyId, response.StatusCode);
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
                RequestUri = new Uri(endpointUrl, UriKind.Relative),
                Method = HttpMethod.Post,
                Content = content
            };

            request.Headers.Add("Authorization", "Bearer " + token);
            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
            request.Headers.Add("PlatformAccessToken", _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App));

            HttpResponseMessage response = await _client.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else
            {
                string reason = await response.Content.ReadAsStringAsync();
                _logger.LogError("// Getting party with orgNo: {OrgNo} or ssn: {Ssn} failed with statuscode {StatusCode} - {Reason}", partyLookup.OrgNo, partyLookup.Ssn, response.StatusCode, reason);

                throw await PlatformHttpException.CreateAsync(response);
            }

            return party;
        }
    }
}
