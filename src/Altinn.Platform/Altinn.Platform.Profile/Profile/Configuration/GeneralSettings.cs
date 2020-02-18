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
        /// Gets or sets if the solution should use mock or not
        /// </summary>
        public bool ShouldUseMock { get; set; }

        /// <summary>
        /// Open Id Connect Well known endpoint
        /// </summary>
        public string OpenIdWellKnownEndpoint { get; set; }

        /// <summary>
        /// Name of the cookie for where JWT is stored
        /// </summary>
        public string JwtCookieName { get; set; }

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
