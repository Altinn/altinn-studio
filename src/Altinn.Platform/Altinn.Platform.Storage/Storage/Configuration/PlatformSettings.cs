using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Configuratin for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API Authorization endpoint by looking into environment variables
        /// </summary>
        public string GetApiAuthorizationEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthorizationEndpoint") ?? ApiAuthorizationEndpoint;
            }
        }
    }
}
