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
        XacmlPolicy GetPolicy(XacmlContextRequest request);
    }
}
