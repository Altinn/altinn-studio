using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
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
        private readonly IAppResources _appResource;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFClient"/> class
        /// </summary>
        /// <param name="platformSettings">The platform settings from loaded configuration.</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClient">The http client</param>
        /// <param name="appResource">The app resources service</param>
        /// <param name="accessTokenGenerator">The platform access token generator</param>
        public RegisterDSFClient(
            IOptions<PlatformSettings> platformSettings,
            ILogger<RegisterDSFClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient,
            IAccessTokenGenerator accessTokenGenerator,
            IAppResources appResource)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _accessTokenGenerator = accessTokenGenerator;
            _appResource = appResource;
        }

        /// <inheritdoc/>
        public async Task<Person> GetPerson(string SSN)
        {
            Person person = null;

            string endpointUrl = $"persons/{SSN}";

            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, endpointUrl, _accessTokenGenerator.GenerateAccessToken(_appResource.GetApplication().Org, _appResource.GetApplication().Id.Split("/")[1]));
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                person = await response.Content.ReadAsAsync<Person>();
            }
            else
            {
                _logger.LogError($"Getting person with ssn {SSN} failed with statuscode {response.StatusCode}");
            }

            return person;
        }
    }
}
