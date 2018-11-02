using AltinnCore.Common.Enums;
using Microsoft.AspNetCore.Authorization;

namespace AltinnCore.Runtime.Authorization
{
    /// <summary>
    /// The authorization requirement for accessing services based on org, service and reportee
    /// </summary>
    public class ServiceAccessRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceAccessRequirement"/> class
        /// </summary>
        /// <param name="actionType">The Action type for this requirement</param>
        public ServiceAccessRequirement(ActionType actionType)
        {
            this.ActionType = actionType;
        }

        /// <summary>
        /// Gets or sets The Action type defined for the policy using this requirement
        /// </summary>
        public ActionType ActionType { get; set; }
    }
}
