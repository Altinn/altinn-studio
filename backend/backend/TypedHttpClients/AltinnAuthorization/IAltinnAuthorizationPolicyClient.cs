using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization
{
    /// <summary>
    /// IAltinnAuthorizationPolicyClient
    /// </summary>
    public interface IAltinnAuthorizationPolicyClient
    {
        /// <summary>
        /// Saves an authorization policy in Platform.Authorization
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="policyFile">PolicyFile</param>
        /// <param name="environmentModel">EnvironmentModel</param>
        /// <returns></returns>
        Task SavePolicy(string org, string app, string policyFile, EnvironmentModel environmentModel);
    }
}
