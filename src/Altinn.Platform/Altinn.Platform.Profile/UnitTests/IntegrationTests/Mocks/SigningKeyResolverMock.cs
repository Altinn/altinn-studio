using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Services;

using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Profile.Tests.IntegrationTests.Mocks
{
    public class SigningKeyResolverMock: ISigningKeysResolver
    {
        public SigningCredentials GetSigningCredentials()
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<SecurityKey>> GetSigningKeys(string issuer)
        {
            List<SecurityKey> signingKeys = new List<SecurityKey>();

            X509Certificate2 cert = new X509Certificate2($"{issuer}-org.pem");
            SecurityKey key = new X509SecurityKey(cert);

            signingKeys.Add(key);

            return Task.FromResult(signingKeys.AsEnumerable());
        }
    }
}
