namespace Altinn.Authorization.ABAC.Interface
{
    using System.Security.Claims;
    using Altinn.Authorization.ABAC.Xacml;

    /// <summary>
    /// The Interface that defines the Policy Information Point.
    /// </summary>
    public interface IPolicyInformationPoint
    {
        /// <summary>
        /// Returns a Claims Princial based on the Context Request.
        /// </summary>
        /// <param name="request">The Context Request.</param>
        /// <returns>The claims principal.</returns>
        ClaimsPrincipal GetClaimsPrincipal(XacmlContextRequest request);
    }
}
