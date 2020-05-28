using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Interface to retrive signing credentials for issuer and signing keys for consumer of tokens
    /// </summary>
    public interface ISigningKeysResolver
    {
        /// <summary>
        /// Returns the signing keys for a given issuer
        /// </summary>
        /// <param name="issuer">The issuer</param>
        /// <returns></returns>
        Task<IEnumerable<SecurityKey>> GetSigningKeys(string issuer);
    }
}
