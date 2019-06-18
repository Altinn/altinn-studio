using System;
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
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register service for service development. Uses local disk to store register data
    /// </summary>
    public class RegisterAppSI : IRegister
    {
        private readonly IDSF _dsf;
        private readonly IER _er;
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterAppSI"/> class
        /// </summary>
        /// <param name="dfs">The dfs</param>
        /// <param name="er">The er</param>
        /// <param name="logger">The logger</param>
        /// <param name="platformSettings">The platform settings</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public RegisterAppSI(
            IDSF dfs,
            IER er,
            ILogger<RegisterAppSI> logger,
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _dsf = dfs;
            _er = er;
            _logger = logger;
            _platformSettings = platformSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
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
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Party));

            string endpointUrl = $"parties/{partyId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            _logger.LogInformation($"/// Authentication test /// Trying to assign adress {_client.BaseAddress}/{endpointUrl}");

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                party = await response.Content.ReadAsAsync<Party>();
            }
            else
            {
                _logger.LogError($"Getting party with partyID {partyId} failed with statuscode {response.StatusCode}");
            }

            return party;
        }
    }
}
