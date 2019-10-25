using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC.Interface
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
        /// Returns a bool based on writing file to storage was successful
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileStream">A stream containing the content of the policy file</param>
        /// <returns></returns>
        Task<bool> WritePolicyAsync(string org, string app, Stream fileStream);
    }
}
