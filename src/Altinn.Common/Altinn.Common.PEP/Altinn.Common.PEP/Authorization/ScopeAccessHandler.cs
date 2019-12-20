using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Common.PEP.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Common.PEP.Authorization
{
    public class ScopeAccessHandler : AuthorizationHandler<ScopeAccessRequirement>
    {
        private readonly PepSettings _pepSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ScopeAccessHandler"/> class.
        /// </summary>
        /// <param name="pepSettings"> The settings for PEP.</param>
        public ScopeAccessHandler(
            IOptions<PepSettings> pepSettings)
        {
            _pepSettings = pepSettings.Value;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ScopeAccessRequirement requirement)
        {
            if (_pepSettings.DisablePEP)
            {
                context.Succeed(requirement);
                return;
            }

            // get scope parameter from  user claims
            string contextScope = context?.User?.Identities?
                .Where(i => i.AuthenticationType != null && i.AuthenticationType.Equals("AuthenticationTypes.Federation"))
                .FirstOrDefault()?.Claims
                .Where(c => c.Type.Equals("urn:altinn:scope"))?
                .Select(c => c.Value).FirstOrDefault();

            // compare scope claim value to
            if (!string.IsNullOrWhiteSpace(contextScope) && contextScope.Contains(requirement.Scope, StringComparison.InvariantCultureIgnoreCase))
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }

            await Task.CompletedTask;
        }
    }
}
