using System.Threading.Tasks;
using AltinnCore.Designer.Services.Models;

namespace AltinnCore.Designer.TypedHttpClients.AltinnAuthorization
{
    /// <summary>
    /// IAltinnAuthorizationPolicyClient
    /// </summary>
    public interface IAltinnAuthorizationPolicyClient
    {
        /// <summary>
        /// Saves an authorization policy in Platform.Authorization
        /// </summary>
        /// <param name="org">string</param>
        /// <param name="app">string</param>
        /// <param name="policyFile">string</param>
        /// <param name="environmentModel">EnvironmentModel</param>
        /// <returns></returns>
        Task SavePolicy(string org, string app, string policyFile, EnvironmentModel environmentModel);
    }
}
