using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Clients
{
    /// <summary>
    /// Http client accessor for accessing clients  for Altinn Platform integration
    /// </summary>
    public class HttpClientAccessor : IHttpClientAccessor
    {
        private readonly PlatformSettings _platformSettings;
        private readonly GeneralSettings _generalSettings;
        private HttpClient _storageClient;
        private HttpClient _registerClient;
        private HttpClient _profileClient;
        private HttpClient _authorizationClient;
        private HttpClient _sblClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="HttpClientAccessor"/> class.
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="generalSettings">The general settings</param>
        /// </summary>
        public HttpClientAccessor(IOptions<PlatformSettings> platformSettings, IOptions<GeneralSettings> generalSettings)
        {
            _platformSettings = platformSettings.Value;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc />
        public HttpClient RegisterClient
        {
            get
            {
                if (_registerClient == null)
                {
                    _registerClient = new HttpClient();
                    _registerClient.BaseAddress = new Uri($"{_platformSettings.GetApiRegisterEndpoint}");
                    _registerClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                }

                return _registerClient;
            }
        }

        /// <inheritdoc />
        public HttpClient ProfileClient
        {
            get
            {
                if (_profileClient == null)
                {
                    _profileClient = new HttpClient();
                    _profileClient.BaseAddress = new Uri($"{_platformSettings.GetApiProfileEndpoint}");
                    _profileClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                }

                return _profileClient;
            }
        }

        /// <inheritdoc />
        public HttpClient StorageClient
        {
            get
            {
                if (_storageClient == null)
                {
                    _storageClient = new HttpClient();
                    _storageClient.BaseAddress = new Uri($"{_platformSettings.GetApiStorageEndpoint}");
                    _storageClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    _storageClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
                }

                return _storageClient;
            }
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
