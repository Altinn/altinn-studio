using AltinnCore.Common.Enums;
using Microsoft.AspNetCore.Authorization;

namespace AltinnCore.Runtime.Authorization
{
    /// <summary>
    /// Requirement uses for authorization policies used for accessing service instances
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core
    /// </summary>
    public class InstanceAccessRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceAccessRequirement"/> class
        /// </summary>
        /// <param name="actionType">The Action type for this requirement</param>
        public InstanceAccessRequirement(ActionType actionType)
        {
            this.ActionType = actionType;
        }

        /// <summary>
        /// Gets or sets The Action type defined for the policy using this requirement
        /// </summary>
        public ActionType ActionType { get; set; }
    }
}
