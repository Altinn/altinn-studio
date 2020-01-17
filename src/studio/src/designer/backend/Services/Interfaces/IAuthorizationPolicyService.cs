using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

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
        /// <param name="deploymentEnvironment">EnvironmentModel</param>
        /// <returns></returns>
        Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string fullCommitId,
            EnvironmentModel deploymentEnvironment);
    }
}
