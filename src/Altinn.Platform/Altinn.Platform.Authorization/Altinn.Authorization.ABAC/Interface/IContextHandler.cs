using Altinn.Authorization.ABAC.Xacml;
using System.Threading.Tasks;

namespace Altinn.Authorization.ABAC.Interface
{
    /// <summary>
    /// Defines Interface for Context Handler.
    /// </summary>
    public interface IContextHandler
    {
        /// <summary>
        /// Enrich the DecisionRequest with needed attributes so PDP can evaluate decision request for a policy/policyset.
        /// </summary>
        /// <param name="decisionRequest">The XacmlContextRequest.</param>
        /// <returns>Enriched context.</returns>
        Task<XacmlContextRequest> Enrich(XacmlContextRequest decisionRequest);
    }
}
