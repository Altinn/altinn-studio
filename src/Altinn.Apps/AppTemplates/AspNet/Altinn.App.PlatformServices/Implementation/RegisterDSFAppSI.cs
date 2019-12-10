using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Implementation
{
    /// <inheritdoc />
    public class RegisterDSFAppSI : IDSF
    {
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The application settings.</param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public RegisterDSFAppSI(
            ILogger<RegisterDSFAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _client = httpClientAccessor.RegisterClient;
        }

        /// <inheritdoc/>
        public async Task<Person> GetPerson(string SSN)
        {
            Person person = null;

            string endpointUrl = $"persons/{SSN}";

            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);
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
