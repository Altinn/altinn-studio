using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Interface to retrive signing credentials for issuer and signing keys for consumer of tokens
    /// </summary>
    public interface ISigningCredentialsResolver
    {
        /// <summary>
        /// Returns certificat to be used for signing a JWT
        /// </summary>
        /// <returns>The signing credentials</returns>
        SigningCredentials GetSigningCredentials();
    }
}
