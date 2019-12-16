using Microsoft.AspNetCore.Authorization;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// Requirement for authorization policies used for accessing apps.
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core.
    /// </summary>
    public class AppAccessRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AppAccessRequirement"/> class
        /// </summary>
        /// <param name="actionType">The Action type for this requirement</param>
        public AppAccessRequirement(string actionType)
        {
            this.ActionType = actionType;
        }

        /// <summary>
        /// Gets or sets The Action type defined for the policy using this requirement
        /// </summary>
        public string ActionType { get; set; }
    }
}
