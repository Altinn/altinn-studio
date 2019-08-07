using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Settings for accessing bridge functionality
    /// </summary>
    public class BridgeSettings
    {
        /// <summary>
        /// The endpoint for the bridge
        /// </summary>
        public string BridgeApiEndpoint { get; set; }

        /// <summary>
        /// Returns the api base url for the bridge.
        /// </summary>
        /// <returns></returns>
        public string GetApiBaseUrl()
        {
            return Environment.GetEnvironmentVariable("BridgeSettings__BridgeApiEndpoint") ?? BridgeApiEndpoint;
        }
    }
}
