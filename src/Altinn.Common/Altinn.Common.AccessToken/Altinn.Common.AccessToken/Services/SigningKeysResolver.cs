using Altinn.Common.AccessToken.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    public class SigningKeysResolver : ISigningKeyResolver
    {
        private readonly AccessTokenSettings _accessTokenSettings;

        public SigningKeysResolver(IOptions<AccessTokenSettings> accessTokenSettings)
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

        public IEnumerable<SecurityKey> GetSigningKeys(string issuer)
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            string filePath = basePath + $"clientsigningkeys/{issuer.ToLower()}.cer";
            List<SecurityKey> signingKeys = new List<SecurityKey>();

            X509Certificate2 cert = new X509Certificate2(filePath);
            SecurityKey key = new X509SecurityKey(cert);

            signingKeys.Add(key);

            return signingKeys;
        }
    }
}
