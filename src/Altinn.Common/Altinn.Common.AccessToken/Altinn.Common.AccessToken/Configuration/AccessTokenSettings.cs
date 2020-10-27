using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Configuration
{
    /// <summary>
    /// Settings for access token
    /// </summary>
    public class AccessTokenSettings
    {
        /// <summary>
        /// Disable access token verification
        /// </summary>
        public bool DisableAccessTokenVerification { get; set;  }

        /// <summary>
        /// The Access token headerId
        /// </summary>
        public string AccessTokenHeaderId { get; set; } = "PlatformAccessToken";

        /// <summary>
        /// Cache lifetime for certs
        /// </summary>
        public int CacheCertLifetimeInSeconds { get; set; } = 3600;

        /// <summary>
        /// ID for cache token in 
        /// </summary>
        public string AccessTokenHttpContextId { get; set; } = "accesstokencontextid";
    }
}
