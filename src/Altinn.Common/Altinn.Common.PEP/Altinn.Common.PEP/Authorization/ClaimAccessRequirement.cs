using Microsoft.AspNetCore.Authorization;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// Requirement for authorization policies used for accessing apps.
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core.
    /// </summary>
    public class ClaimAccessRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ClaimAccessRequirement"/> class
        /// </summary>
        /// <param name="claimType">The claim type.</param>
        /// <param name="claimValue">The claim value</param>
        public ClaimAccessRequirement(string claimType, string claimValue)
        {
            this.ClaimType = claimType;
            this.ClaimValue = claimValue;
        }

        /// <summary>
        /// Gets or sets the claim type for the required claim
        /// </summary>
        public string ClaimType { get; set; }

        /// <summary>
        /// Gets or sets the claim value
        /// </summary>
        public string ClaimValue { get; set; }
    }
}
