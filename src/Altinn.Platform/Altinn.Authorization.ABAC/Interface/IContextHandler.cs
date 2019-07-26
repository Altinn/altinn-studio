using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC.Interface
{
    /// <summary>
    /// Interface for Context Handler
    /// </summary>
    public interface IContextHandler
    {
        /// <summary>
        /// Updates the Context
        /// </summary>
        /// <param name="request">The XacmlContextRequest</param>
        /// <returns></returns>
        XacmlContextRequest UpdateContextRequest(XacmlContextRequest request);
    }
}
