using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// IAuthorizationPolicyService
    /// </summary>
    public interface IAuthorizationPolicyService
    {
        /// <summary>
        /// Updates the Authorization policy for an app
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="fullCommitId">The full commit SHA</param>
        /// <param name="envName">Environment name</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns></returns>
        Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string fullCommitId,
            string envName,
            CancellationToken cancellationToken = default);
    }
}
