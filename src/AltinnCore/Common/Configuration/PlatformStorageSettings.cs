using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// configuratin for platform storage api
    /// </summary>
    public class PlatformStorageSettings
    {
        /// <summary>
        /// Gets or sets the url for the API Endpoint
        /// </summary>
        public string ApiEndPoint { get; set; }

        /// <summary>
        /// Gets or sets the API endpoint host
        /// </summary>
        public string ApiEndPointHost { get; set; }

        /// <summary>
        /// Gets Api end point
        /// </summary>
        public string ApiUrl
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformStorageSettings__ApiEndPoint") ?? ApiEndPoint;
            }
        }
    }
}
