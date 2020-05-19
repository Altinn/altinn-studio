using Altinn.Common.AccessToken.Services;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Platform.Register.Tests.Mocks
{
    public class SigningKeyRetrieverMock: ISigningKeysRetriever
    {
        public async Task<IEnumerable<SecurityKey>> GetSigningKeys(string issuer)
        {
            List<SecurityKey> signingKeys = new List<SecurityKey>();

            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

            signingKeys.Add(key);

            return await Task.FromResult(signingKeys);
        }
    }
}
