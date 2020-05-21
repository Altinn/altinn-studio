using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Interface to retrive signing credentials for issuer and signing keys for consumer of tokens
    /// </summary>
    public interface ISigningKeyResolver
    {
        /// <summary>
        /// Returns the signing keys for a given issuer
        /// </summary>
        /// <param name="issuer">The issuer</param>
        /// <returns></returns>
        Task<IEnumerable<SecurityKey>> GetSigningKeys(string issuer);

        /// <summary>
        /// Returns certificat to be used for signing a JWT
        /// </summary>
        /// <returns>The signing credentials</returns>
        SigningCredentials GetSigningCredentials();
    }
}
