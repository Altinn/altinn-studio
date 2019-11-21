using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for application in application container mode
    /// </summary>
    public class ApplicationAppSI : IApplication
    {
        private readonly IData _data;
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        public ApplicationAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<ApplicationAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.StorageClient;
        }

        /// <inheritdoc />
        public async Task<Application> GetApplication(string org, string app)
        {
            string appId = $"{org}/{app}";
            string storageEndpoint = _platformSettings.GetApiStorageEndpoint;
            _logger.LogInformation($"Client url {storageEndpoint}");

            Application application = null;
            string getApplicationMetadataUrl = $"{storageEndpoint}applications/{appId}";

            HttpResponseMessage response = await _client.GetAsync(getApplicationMetadataUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string applicationData = await response.Content.ReadAsStringAsync();
                application = JsonConvert.DeserializeObject<Application>(applicationData);
            }
            else
            {
                _logger.LogError($"Unable to fetch application with application id {appId}");
            }

            return application;
        }
    }
}
