using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// Configuratin for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API base Endpoint
        /// </summary>
        public string ApiBaseEndpoint { get; set; }        

        /// <summary>
        /// Gets the url for the API base Endpoint
        /// </summary>
        public string GetApiBaseEndpoint()
        {
            return Environment.GetEnvironmentVariable("PlatformSettings__ApiBaseEndpoint") ?? ApiBaseEndpoint;
        }
    }
}
