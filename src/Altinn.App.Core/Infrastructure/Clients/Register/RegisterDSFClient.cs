using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Register
{
    /// <summary>
    /// A client for retriecing DSF data from Altinn Platform.
    /// </summary>
    public class RegisterDSFClient : IDSF
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly IAppMetadata _appMetadata;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFClient"/> class
        /// </summary>
        /// <param name="platformSettings">The platform settings from loaded configuration.</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClient">The http client</param>
        /// <param name="accessTokenGenerator">The platform access token generator</param>
        /// <param name="appMetadata">The app metadata service</param>
        public RegisterDSFClient(
            IOptions<PlatformSettings> platformSettings,
            ILogger<RegisterDSFClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient,
            IAccessTokenGenerator accessTokenGenerator,
            IAppMetadata appMetadata)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _accessTokenGenerator = accessTokenGenerator;
            _appMetadata = appMetadata;
        }

        /// <inheritdoc/>
        public async Task<Person?> GetPerson(string SSN)
        {
            Person? person = null;

            string endpointUrl = $"persons/{SSN}";

            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App));
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                person = await response.Content.ReadAsAsync<Person>();
            }
            else
            {
                _logger.LogError("Getting person with ssn {Ssn} failed with statuscode {StatusCode}", SSN, response.StatusCode);
            }

            return person;
        }
    }
}
