using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Register.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the bridge api endpoint
        /// </summary>
        public string BridgeApiEndpoint { get; set; }

        /// <summary>
        /// Gets the api base url for sbl bridge
        /// </summary>
        /// <returns>the api base url</returns>
        public string GetApiBaseUrl()
        {
            return Environment.GetEnvironmentVariable("GeneralSettings__BridgeApiEndpoint") ?? BridgeApiEndpoint;
        }
    }
}
