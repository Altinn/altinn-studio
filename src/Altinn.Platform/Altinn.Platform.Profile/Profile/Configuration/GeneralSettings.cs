using System;

namespace Altinn.Platform.Profile.Configuration
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
        /// <returns></returns>
        public string GetApiBaseUrl()
        {
            return Environment.GetEnvironmentVariable("GeneralSettings__BridgeApiEndpoint") ?? BridgeApiEndpoint;
        }
    }
}
