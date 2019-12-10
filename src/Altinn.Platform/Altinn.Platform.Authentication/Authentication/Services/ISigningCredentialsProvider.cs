using System.Threading.Tasks;

using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Defines the methods to obtain a <see cref="SigningCredentials"/> instance that can be used when generating JSON Web Tokens.
    /// </summary>
    public interface ISigningCredentialsProvider
    {
        /// <summary>
        /// Get the <see cref="SigningCredentials"/> to use when generating JSON Web Tokens.
        /// </summary>
        /// <returns>Identified <see cref="SigningCredentials"/>.</returns>
        Task<SigningCredentials> GetSigningCredentials();
    }
}
