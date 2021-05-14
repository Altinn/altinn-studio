using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Configuration
{
    /// <summary>
    /// Confiugration for access token 
    /// </summary>
    public class AccessTokenSettings
    {
        /// <summary>
        /// The folder where the signing keys are stored. 
        /// </summary>
        public string AccessTokenSigningKeysFolder { get; set; } = "accesstoken/";

        /// <summary>
        /// The lifetime for a token
        /// </summary>
        public int TokenLifetimeInSeconds { get; set; } = 300;

        /// <summary>
        /// The name of the cert for access token signing
        /// </summary>
        public string AccessTokenSigningCertificateFileName { get; set; } = "accesstokencredentials.pfx";
    }
}
