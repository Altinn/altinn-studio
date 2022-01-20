using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Represents a controller that can expose standard endpoints published by an open id provider.
    /// </summary>
    [Route("authentication/api/v1/openid/.well-known")]
    [AllowAnonymous]
    [ApiController]
    public class OpenIdController : ControllerBase
    {
        private readonly GeneralSettings _generalSettings;

        private readonly IJwtSigningCertificateProvider _certificateProvider;

        /// <summary>
        /// Initialise a new instance of <see cref="OpenIdController"/> with the given input values.
        /// </summary>
        /// <param name="generalSettings">The application general settings.</param>
        /// <param name="certificateProvider">A service able to obtain a list of valid certificates that can be used to sign/validate a JWT.</param>
        public OpenIdController(
            IOptions<GeneralSettings> generalSettings,
            IJwtSigningCertificateProvider certificateProvider)
        {
            _generalSettings = generalSettings.Value;
            _certificateProvider = certificateProvider;
        }

        /// <summary>
        /// Returns a discovery document
        /// </summary>
        /// <returns>The configuration object for Open ID Connect.</returns>
        [HttpGet("openid-configuration")]
        [Produces("application/json")]
        public DiscoveryDocument GetOpenIdConfigurationAsync()
        {
            string baseUrl = _generalSettings.AltinnOidcIssuerUrl;

            DiscoveryDocument discoveryDocument = new DiscoveryDocument
            {
                // REQUIRED
                Issuer = new Uri(baseUrl).ToString(),

                // REQUIRED
                AuthorizationEndpoint = new Uri(baseUrl).ToString(),

                // This is REQUIRED unless only the Implicit Flow is used.
                TokenEndpoint = new Uri(baseUrl).ToString(),

                // REQUIRED
                JwksUri = new Uri(baseUrl + ".well-known/openid-configuration/jwks").ToString(),

                // REQUIRED
                ResponseTypesSupported = new[] { "token" }, // "code", "id_token", "id_token token", 

                // REQUIRED
                SubjectTypesSupported = new[] { "pairwise" },

                // REQUIRED
                IdTokenSigningAlgValuesSupported = new[] { "RS256" }
            };

            return discoveryDocument;
        }

        /// <summary>
        /// Returns the JSON Web Key Set to use when validating a token.
        /// </summary>
        /// <returns>The Altinn JSON Web Key Set.</returns>
        [Produces("application/json")]
        [HttpGet("openid-configuration/jwks")]
        public async Task<JwksDocument> GetJsonWebKeySetAsync()
        {
            JwksDocument jwksDocument = new JwksDocument
            {
                Keys = new List<JwkDocument>()
            };

            List<X509Certificate2> certificates = await _certificateProvider.GetCertificates();

            foreach (X509Certificate2 cert in certificates)
            {
                string oidFriendlyName = cert.PublicKey.Oid.FriendlyName;

                RSA rsaPublicKey = cert.GetRSAPublicKey();
                RSAParameters exportParameters = rsaPublicKey.ExportParameters(false);
                string exponent = Convert.ToBase64String(exportParameters.Exponent);
                string modulus = Convert.ToBase64String(exportParameters.Modulus);

                List<string> chain = ExportChain(cert);

                JwkDocument jwkDocument = new JwkDocument
                {
                    KeyType = oidFriendlyName, PublicKeyUse = "sig", KeyId = cert.Thumbprint, Exponent = exponent, Modulus = modulus, X509Chain = chain
                };

                jwksDocument.Keys.Add(jwkDocument);
            }

            return jwksDocument;
        }

        private List<string> ExportChain(X509Certificate2 cert)
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
