using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.Platform.Receipt.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Receipt.Clients
{
    /// <summary>
    /// Http client accessor for accessing clients for Altinn Platform integration
    /// </summary>
    public class HttpClientAccessor : IHttpClientAccessor
    {
        private readonly PlatformSettings _platformSettings;

        private HttpClient _storageClient;
        private HttpClient _registerClient;
        private HttpClient _profileClient;

        private const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";

        /// <summary>
        /// Initialises a new instance of the <see cref="HttpClientAccessor"/> class with the given platform settings.
        /// <param name="platformSettings">The platform settings used to configure the HTTP clients.</param>
        /// </summary>
        public HttpClientAccessor(IOptions<PlatformSettings> platformSettings)
        {
            _platformSettings = platformSettings.Value;
        }

        /// <inheritdoc />
        public HttpClient RegisterClient
        {
            get
            {
                if (_registerClient != null)
                {
                    return _registerClient;
                }

                _registerClient = GetNewHttpClient(_platformSettings.ApiRegisterEndpoint);
                _registerClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                return _registerClient;
            }
        }

        /// <inheritdoc />
        public HttpClient ProfileClient
        {
            get
            {
                if (_profileClient != null)
                {
                    return _profileClient;
                }

                _profileClient = GetNewHttpClient(_platformSettings.ApiProfileEndpoint);
                _profileClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                return _profileClient;
            }
        }

        /// <inheritdoc />
        public HttpClient StorageClient
        {
            get
            {
                if (_storageClient != null)
                {
                    return _storageClient;
                }

                _storageClient = GetNewHttpClient(_platformSettings.ApiStorageEndpoint);
                _storageClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                return _storageClient;
            }
        }
        
        private HttpClient GetNewHttpClient(string apiEndpoint)
        {
            HttpClient httpClient = new HttpClient
            {
                BaseAddress = new Uri(apiEndpoint)
            };

            httpClient.DefaultRequestHeaders.Add(SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);

            return httpClient;
        }
    }
}
