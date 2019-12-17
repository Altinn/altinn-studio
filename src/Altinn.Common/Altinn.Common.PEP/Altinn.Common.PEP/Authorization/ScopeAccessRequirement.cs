using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// Requirement for authorization policies used for validating a client scope.
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core.
    /// </summary>
    public class ScopeAccessRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ScopeAccessRequirement"/> class
        /// </summary>
        /// <param name="scope">The scope for this requirement</param>
        public ScopeAccessRequirement(string scope)
        {
            this.Scope = scope;
        }

        /// <summary>
        /// Gets or sets the scope defined for the policy using this requirement
        /// </summary>
        public string Scope { get; set; }
    }
}
