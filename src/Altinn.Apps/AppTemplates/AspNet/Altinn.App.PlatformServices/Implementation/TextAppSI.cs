using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
namespace Altinn.App.Services.Implementation
{
    public class TextAppSI : IText
    {
        private readonly ILogger _logger;
        private readonly AppSettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextAppSI"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        public TextAppSI(
            IOptions<AppSettings> settings,
              IOptions<PlatformSettings> platformSettings,
            ILogger<TextAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient)
        {
            _settings = settings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<TextResource> GetText(string org, string app, string language)
        {
            TextResource textResource = null;

            string url = $"applications/{org}/{app}/texts/{language}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, url);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                textResource = await response.Content.ReadAsAsync<TextResource>();
            }
            else
            {
                _logger.LogError($"Getting text resource for {org}/{app} with language code: {language} failed with statuscode {response.StatusCode}");
            }

            return textResource;
        }
    }
}
