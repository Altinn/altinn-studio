using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.App.Services.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Clients
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
        private HttpClient _authorizationClient;
        private HttpClient _authenticationClient;
        private HttpClient _pdfClient;

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
                _storageClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));

                return _storageClient;
            }
        }

        /// <inheritdoc />
        public HttpClient AuthorizationClient
        {
            get
            {
                if (_authorizationClient != null)
                {
                    return _authorizationClient;
                }

                _authorizationClient = GetNewHttpClient(_platformSettings.ApiAuthorizationEndpoint);
                _authorizationClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                return _authorizationClient;
            }
        }

        /// <inheritdoc />
        public HttpClient AuthenticationClient
        {
            get
            {
                if (_authenticationClient != null)
                {
                    return _authenticationClient;
                }

                _authenticationClient = GetNewHttpClient(_platformSettings.ApiAuthenticationEndpoint);
                _authenticationClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                return _authenticationClient;
            }
        }


        /// <inheritdoc />
        public HttpClient PdfClient
        {
            get
            {
                if (_pdfClient != null)
                {
                    return _pdfClient;
                }

                _pdfClient = GetNewHttpClient(_platformSettings.ApiPdfEndpoint);

                return _pdfClient;
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
