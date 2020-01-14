using System.Threading.Tasks;
using AltinnCore.Designer.Services.Models;

namespace AltinnCore.Designer.Services.Interfaces
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
        /// <param name="deploymentEnvironment">EnvironmentModel</param>
        /// <returns></returns>
        Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string fullCommitId,
            EnvironmentModel deploymentEnvironment);
    }
}
