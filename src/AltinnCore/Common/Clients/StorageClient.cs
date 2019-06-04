using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Clients
{
    /// <summary>
    /// Storage client for handling... 
    /// </summary>
    public class StorageClient : IHttpClientAccessor
    {
        private readonly PlatformSettings _platformSettings;

        /// <inheritdoc />
        public HttpClient Client { get; }

        /// <summary>
        /// <param name="platformSettings">the platform settings</param>
        /// </summary>
        public StorageClient(IOptions<PlatformSettings> platformSettings)
        {
            _platformSettings = platformSettings.Value;

            Client = new HttpClient();
            Client.BaseAddress = new Uri($"{_platformSettings.GetApiStorageEndpoint}");
        }
    }
}
