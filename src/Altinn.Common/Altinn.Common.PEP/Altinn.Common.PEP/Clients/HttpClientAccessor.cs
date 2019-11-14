using Altinn.Common.PEP.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Net.Http;
using System.Net.Http.Headers;

namespace Altinn.Common.PEP.Clients
{
    /// <summary>
    /// Http client accessor for accessing clients  for Altinn Platform integration
    /// </summary>
    public class HttpClientAccessor : IHttpClientAccessor
    {
        private readonly PlatformSettings _platformSettings;
        private HttpClient _authorizationClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="HttpClientAccessor"/> class.
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="generalSettings">The general settings</param>
        /// </summary>
        public HttpClientAccessor(IOptions<PlatformSettings> platformSettings, IOptions<GeneralSettings> generalSettings)
        {
            _platformSettings = platformSettings.Value;
        }

        /// <inheritdoc />
        public HttpClient AuthorizationClient
        {
            get
            {
                if (_authorizationClient == null)
                {
                    _authorizationClient = new HttpClient();
                    _authorizationClient.BaseAddress = new Uri($"{_platformSettings.GetApiAuthorizationEndpoint}");
                    _authorizationClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                }

                return _authorizationClient;
            }
        }
    }
}
