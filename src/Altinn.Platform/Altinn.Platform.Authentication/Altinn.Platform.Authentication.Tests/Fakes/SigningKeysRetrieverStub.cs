using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Tests.Fakes
{
    /// <inheritdoc />
    public class SigningKeysRetrieverStub : ISigningKeysRetriever
    {
        /// <inheritdoc />
        public async Task<ICollection<SecurityKey>> GetSigningKeys(string url)
        {
            List<SecurityKey> signingKeys = new List<SecurityKey>();

            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

            signingKeys.Add(key);

            return await Task.FromResult(signingKeys);
        }
    }
}
