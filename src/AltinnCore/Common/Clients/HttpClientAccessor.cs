using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Clients
{
    /// <summary>
    /// Http client accessor for handling... 
    /// </summary>
    public class HttpClientAccessor : IHttpClientAccessor
    {
        private readonly PlatformSettings _platformSettings;
        private readonly HttpClient _storageClient;
        private readonly HttpClient _registerClient;
        private readonly HttpClient _profileClient;

        /// <summary>
        /// <param name="platformSettings">the platform settings</param>
        /// </summary>
        public HttpClientAccessor(IOptions<PlatformSettings> platformSettings)
        {
            _platformSettings = platformSettings.Value;

            _storageClient = new HttpClient();
            _storageClient.BaseAddress = new Uri($"{_platformSettings.GetApiStorageEndpoint}");

            _profileClient = new HttpClient();
            _profileClient.BaseAddress = new Uri($"{_platformSettings.GetApiProfileEndpoint}");

            _registerClient = new HttpClient();
            _registerClient.BaseAddress = new Uri($"{_platformSettings.GetApiRegisterEndpoint}");
        }

        /// <inheritdoc />
        public HttpClient RegisterClient => _registerClient;

        /// <inheritdoc />
        public HttpClient ProfileClient => _profileClient;

        /// <inheritdoc />
        public HttpClient StorageClient => _storageClient;
    }
}
