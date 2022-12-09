using System.IO;
using System.Security.Cryptography.X509Certificates;
using Altinn.Common.AccessTokenClient.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Class to resolve certificate to sign JWT token uses as Access token
    /// </summary>
    public class SigningCredentialsResolver : ISigningCredentialsResolver
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private static X509SigningCredentials _x509SigningCredentials = null;
        private static readonly object _lockObject = new object();

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="accessTokenSettings">Access token settings</param>
        public SigningCredentialsResolver(IOptions<AccessTokenSettings> accessTokenSettings)
        {
            _accessTokenSettings = accessTokenSettings.Value;
        }

        /// <summary>
        /// Find the configured 
        /// </summary>
        /// <returns></returns>
        public SigningCredentials GetSigningCredentials()
        {
            return GetSigningCredentials(_accessTokenSettings);
        }

        // Static method to make sonarcloud happy (not update static field from instance method)
        private static SigningCredentials GetSigningCredentials(AccessTokenSettings accessTokenSettings)
        {
            if (_x509SigningCredentials == null)
            {
                lock (_lockObject)
                {
                    if (_x509SigningCredentials == null)
                    {
                        string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
                        string certPath = basePath + $"{accessTokenSettings.AccessTokenSigningKeysFolder}{accessTokenSettings.AccessTokenSigningCertificateFileName}";
                        X509Certificate2 cert = new X509Certificate2(certPath);
                        _x509SigningCredentials = new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
                    }
                }
            }

            return _x509SigningCredentials;
        }
    }
}
