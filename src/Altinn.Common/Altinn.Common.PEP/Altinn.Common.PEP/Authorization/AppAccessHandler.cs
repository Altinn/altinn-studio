using System;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// AuthorizationHandler that is created for handling access to app.
    /// Authorizes based om AppAccessRequirement and app id from route
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core
    /// </summary>
    public class AppAccessHandler : AuthorizationHandler<AppAccessRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IPDP _pdp;
        private readonly PepSettings _pepSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppAccessHandler"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="pdp">The pdp</param>
        /// <param name="pepSettings">The settings for pep</param>
        public AppAccessHandler(
            IHttpContextAccessor httpContextAccessor,
            IPDP pdp,
            IOptions<PepSettings> pepSettings)
        {
            _httpContextAccessor = httpContextAccessor;
            _pdp = pdp;
            _pepSettings = pepSettings.Value;
        }

        /// <summary>
        /// This method authorize access bases on context and requirement
        /// Is triggered by annotation on MVC action and setup in startup.
        /// </summary>
        /// <param name="context">The context</param>
        /// <param name="requirement">The requirement</param>
        /// <returns>A Task</returns>
        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AppAccessRequirement requirement)
        {
            if (_pepSettings.DisablePEP)
            {
                context.Succeed(requirement);
                return;
            }

            XacmlJsonRequest request = DecisionHelper.CreateXacmlJsonRequest(context, requirement, _httpContextAccessor.HttpContext.GetRouteData());
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if (response == null)
            {
                throw new ArgumentNullException("response");
            }

            if (!DecisionHelper.ValidateResponse(response.Response, context.User))
            {
                context.Fail();
            }

            context.Succeed(requirement);
            await Task.CompletedTask;
        }
    }
}
