using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the interface for the Policy Retrival Point
    /// </summary>
    public interface IPolicyRetrievalPoint
    {
        /// <summary>
        /// Returns a policy based on the context request
        /// </summary>
        /// <param name="request">The context request</param>
        /// <returns></returns>
        Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request);

        /// <summary>
        /// Returns a policy based the org and app
        /// </summary>
        /// <param name="org">The organisation</param>
        /// <param name="app">The app</param>
        /// <returns></returns>
        Task<XacmlPolicy> GetPolicyAsync(string org, string app);

        /// <summary>
        /// Returns a policy based the org, app and ids for the delegating and receiving entities
        /// </summary>
        /// <param name="org">The organisation</param>
        /// <param name="app">The app</param>
        /// <param name="offeredBy">The party id of the entity which the policy is delegated from</param>
        /// <param name="coveredBy">The party or user id of the entity which the policy is delegated to</param>
        /// <returns></returns>
        Task<XacmlPolicy> GetDelegationPolicyAsync(string org, string app, string offeredBy, string coveredBy);
    }
}
