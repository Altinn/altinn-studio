using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Settings for accessing bridge functionality
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// The endpoint for the bridge
        /// </summary>
        public string RegistryApiEndpoint { get; set; }

        /// <summary>
        /// Returns the api base url for the bridge.
        /// </summary>
        /// <returns></returns>
        public string GetRegistryApiBaseUrl()
        {
            return Environment.GetEnvironmentVariable("RegistrySettings__RegistryApiEndpoint") ?? RegistryApiEndpoint;
        }
    }
}
