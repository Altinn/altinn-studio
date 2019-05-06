using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Authentication.Constants
{
    public class KeyVaultSettings
    {
        /// <summary>
        /// The key vault reader client id
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// The key vault client secret
        /// </summary>
        public string ClientSecret { get; set; }

        /// <summary>
        /// The uri to the key vault
        /// </summary>
        public string SecretUri { get; set; }

        /// <summary>
        /// The name of the certificate
        /// </summary>
        public string CertificateName { get; set; }
    }
}
