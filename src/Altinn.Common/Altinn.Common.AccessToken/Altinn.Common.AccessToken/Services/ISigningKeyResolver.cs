using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;

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
        IEnumerable<SecurityKey> GetSigningKeys(string issuer);

        SigningCredentials GetSigningCredentials();
    }
}
