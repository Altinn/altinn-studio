using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;

using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Represents a controller that can expose standard endpoints published by an open id provider.
    /// </summary>
    [Route("authentication/api/v1/openid/.well-known")]
    [ApiController]
    public class OpenIdController : ControllerBase
    {
        private readonly KeyVaultSettings keyVaultSettings;
        private readonly GeneralSettings generalSettings;
        private readonly CertificateSettings certSettings;

        /// <summary>
        /// Initialise a new instance of <see cref="OpenIdController"/> with the given input values.
        /// </summary>
        /// <param name="generalSettings">The application general settings.</param>
        /// <param name="certSettings">The settings section for certificate information.</param>
        /// <param name="keyVaultSettings">The settings section for the platform key vault.</param>
        public OpenIdController(IOptions<GeneralSettings> generalSettings, IOptions<CertificateSettings> certSettings, IOptions<KeyVaultSettings> keyVaultSettings)
        {
            this.generalSettings = generalSettings.Value;
            this.certSettings = certSettings.Value;
            this.keyVaultSettings = keyVaultSettings.Value;
        }

        /// <summary>
        /// Returns a discovery document
        /// </summary>
        /// <returns>The configuration object for Open ID Connect.</returns>
        [HttpGet("openid-configuration")]
        public async Task<IActionResult> GetOpenIdConfiguration()
        {
            string baseUrl = generalSettings.GetPlatformEndpoint;

            DiscoveryDocument discoveryDocument = new DiscoveryDocument
            {
                // REQUIRED
                Issuer = new Uri(baseUrl).ToString(),

                // REQUIRED
                AuthorizationEndpoint = new Uri(baseUrl).ToString(),

                // This is REQUIRED unless only the Implicit Flow is used.
                TokenEndpoint = new Uri(baseUrl).ToString(),

                // REQUIRED
                JwksUri = new Uri(baseUrl + "authentication/api/v1/OpenId/.well-known/openid-configuration/jwks").ToString(),

                // REQUIRED
                ResponseTypesSupported = new[] { "token" }, // "code", "id_token", "id_token token", 

                // REQUIRED
                SubjectTypesSupported = new[] { "pairwise" },

                // REQUIRED
                IdTokenSigningAlgValuesSupported = new[] { "RS256" }
            };

            return await Task.FromResult(Ok(discoveryDocument));
        }

        /// <summary>
        /// Returns the JSON Web Key Set to use when validating a token.
        /// </summary>
        /// <returns>The Altinn JSON Web Key Set.</returns>
        [HttpGet("openid-configuration/jwks")]
        public async Task<IActionResult> GetJsonWebKeySet()
        {
            X509Certificate2 cert = GetTokenCertificate();

            string oidFriendlyName = cert.PublicKey.Oid.FriendlyName;

            RSA rsaPublicKey = cert.GetRSAPublicKey();
            RSAParameters exportParameters = rsaPublicKey.ExportParameters(false);
            string exponent = Convert.ToBase64String(exportParameters.Exponent);
            string modulus = Convert.ToBase64String(exportParameters.Modulus);

            List<string> chain = ExportChain(cert);

            JwksDocument jwksDocument = new JwksDocument
            {
                Keys = new List<JwkDocument>
                {
                    new JwkDocument
                    {
                        KeyType = oidFriendlyName, PublicKeyUse = "sig", KeyId = cert.Thumbprint, Exponent = exponent, Modulus = modulus, X509Chain = chain
                    }
                }
            };

            return await Task.FromResult(Ok(jwksDocument));
        }

        private X509Certificate2 GetTokenCertificate()
        {
            if (string.IsNullOrEmpty(keyVaultSettings.ClientId) || string.IsNullOrEmpty(keyVaultSettings.ClientSecret))
            {
                return new X509Certificate2(certSettings.CertificatePath, certSettings.CertificatePwd);
            }

            KeyVaultClient client = KeyVaultSettings.GetClient(keyVaultSettings.ClientId, keyVaultSettings.ClientSecret);
            CertificateBundle certificate = client.GetCertificateAsync(keyVaultSettings.SecretUri, certSettings.CertificateName).GetAwaiter().GetResult();
            SecretBundle secret = client.GetSecretAsync(certificate.SecretIdentifier.Identifier).GetAwaiter().GetResult();
            byte[] pfxBytes = Convert.FromBase64String(secret.Value);
            return new X509Certificate2(pfxBytes);
        }

        private static List<string> ExportChain(X509Certificate2 cert)
        {
            List<string> result = new List<string>();

            using (X509Chain chain = new X509Chain { ChainPolicy = { RevocationMode = X509RevocationMode.NoCheck } })
            {
                chain.Build(cert);

                foreach (X509ChainElement chainElement in chain.ChainElements)
                {
                    string export = Convert.ToBase64String(chainElement.Certificate.Export(X509ContentType.Cert));
                    result.Add(export);
                }
            }

            return result;
        }
    }
}
