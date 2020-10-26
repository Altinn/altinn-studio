using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// Represents an authorization handler that can perform authorization based on scope
    /// </summary>
    public class ScopeAccessHandler : AuthorizationHandler<ScopeAccessRequirement>
    {
        private readonly ILogger _logger;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="ScopeAccessHandler"/> class.
        /// </summary>
        /// <param name="logger">A logger from the logger factory</param>
        public ScopeAccessHandler(ILogger<ScopeAccessHandler> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Performs necessary logic to evaluate the scope requirement.
        /// </summary>
        /// <param name="context">The current <see cref="AuthorizationHandlerContext"/></param>
        /// <param name="requirement">The scope requirement to evaluate.</param>
        /// <returns>Returns a Task for async await</returns>
        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ScopeAccessRequirement requirement)
        {
            _logger.LogInformation($"// ScopeAccessHandler // HandleRequirementAsync // Verifying scope: {requirement.Scope}");

            // get scope parameter from  user claims
            string contextScope = context?.User?.Identities 
                ?.FirstOrDefault(i => i.AuthenticationType != null && i.AuthenticationType.Equals("AuthenticationTypes.Federation"))?.Claims
                .Where(c => c.Type.Equals("urn:altinn:scope"))?
                .Select(c => c.Value).FirstOrDefault();

            contextScope ??= context?.User?.Claims.Where(c => c.Type.Equals("scope")).Select(c => c.Value).FirstOrDefault();

            _logger.LogInformation($"// ScopeAccessHandler // HandleRequirementAsync // Scope claim in context: {contextScope}");

            _logger.LogInformation($"// ScopeAccessHandler // HandleRequirementAsync // Identity with correct authNType " +
                                    $"{context?.User?.Identities?.Where(i => i.AuthenticationType != null && i.AuthenticationType.Equals("AuthenticationTypes.Federation"))}");

            // compare scope claim value to
            if (!string.IsNullOrWhiteSpace(contextScope) && contextScope.Contains(requirement.Scope, StringComparison.InvariantCultureIgnoreCase))
            {
                _logger.LogInformation($"// ScopeAccessHandler // HandleRequirementAsync // Found matching scope in claims.");
                context.Succeed(requirement);
            }
            else
            {
                _logger.LogInformation($"// ScopeAccessHandler // HandleRequirementAsync // Did NOT find matching scope in claims.");
                context.Fail();
            }

            await Task.CompletedTask;
        }
    }
}
