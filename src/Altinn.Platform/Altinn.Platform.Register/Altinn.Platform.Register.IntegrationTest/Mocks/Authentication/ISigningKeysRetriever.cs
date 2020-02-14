using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication
{
    /// <summary>
    /// Defines methods to retrieve signing keys from a remote well-known OpenID configuration endpoint
    /// </summary>
    public interface ISigningKeysRetriever
    {
        /// <summary>
        /// Get the signing keys published by the given endpoint.
        /// </summary>
        /// <param name="url">The full address of the published configuration.</param>
        /// <returns></returns>
        Task<ICollection<SecurityKey>> GetSigningKeys(string url);
    }
}
