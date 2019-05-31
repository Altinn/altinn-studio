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
    public class StorageClient : HttpClient
    {
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Shared public client to be used by the service implentations
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="client">the platform settings</param>
        /// </summary>
        public StorageClient(
            IOptions<PlatformSettings> platformSettings,
            HttpClient client)
        {
            _platformSettings = platformSettings.Value;

            client.BaseAddress = new Uri($"{_platformSettings.GetApiStorageEndpoint}");
            Client = client;
        }
    }
}
