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
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            string certPath = basePath + $"{_accessTokenSettings.AccessTokenSigningKeysFolder}{_accessTokenSettings.AccessTokenSigningCertificateFileName}";
            X509Certificate2 cert = new X509Certificate2(certPath);
            return new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
        }
    }
}
