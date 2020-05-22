using Altinn.Common.AccessTokenClient.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IO;
using System.Security.Cryptography.X509Certificates;

namespace Altinn.Common.AccessTokenClient.Services
{
    public class SigningCredentialsResolver : ISigningCredentialsResolver
    {
        private readonly AccessTokenSettings _accessTokenSettings;

        public SigningCredentialsResolver(IOptions<AccessTokenSettings> accessTokenSettings)
        {
            _accessTokenSettings = accessTokenSettings.Value;
        }

        public SigningCredentials GetSigningCredentials()
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            string certPath = basePath + $"accesstoken/signingcredentials.pfx";
            X509Certificate2 cert = new X509Certificate2(certPath, "qwer1234");
            return new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
        }
}
}
