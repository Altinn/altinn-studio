using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Authorization;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    [Route("api/[controller]")]
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/policy")]
    public class PolicyController : ControllerBase
    {
        private readonly IRepository _repository;

        public PolicyController(IRepository repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Puts the application policy, url PUT "/designer/api/org/app/apppolicy
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationPolicy">The application metadata</param>
        /// <returns>The updated application metadata</returns>
        [HttpGet]
        public ActionResult GetApplicationPolicy(string org, string app)
        {
            XacmlPolicy xacmlPolicy  = _repository.GetPolicy(org, app, null);

            ResourcePolicy resourcePolicy =  PolicyConverter.ConvertPolicy(xacmlPolicy);
            
            return Ok(resourcePolicy);
        }


        /// <summary>
        /// Puts the application policy, url PUT "/designer/api/org/app/apppolicy
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationPolicy">The application metadata</param>
        /// <param name="resourceid">The application metadata</param>
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        [Route("")]
        [Route("{resourceid}")]
        public ActionResult UpdateApplicationPolicy(string org, string app, string resourceid, [FromBody] ResourcePolicy applicationPolicy)
        {
            XacmlPolicy xacmlPolicy = PolicyConverter.ConvertPolicy(applicationPolicy);

            _repository.SavePolicy(org, app, resourceid, xacmlPolicy);

            return Ok(applicationPolicy);
        }

        [HttpGet]
        [Route("validate/{resourceid}")]
        [Route("validate")]
        public ActionResult ValidatePolicy(string org, string app, string resourceid)
        {
            XacmlPolicy xacmlPolicy = _repository.GetPolicy(org, app, resourceid);

            ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);
            ValidationProblemDetails vpd = ValidatePolicy(resourcePolicy);
            if(vpd.Errors.Count == 0) {
                vpd.Status = 200;
            }
            return Ok(vpd);
        }

        /// <summary>
        /// Create an application metadata, url POST "/designer/api/org/app/metadata"
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The created application metadata</returns>
        [HttpPost]
        public ActionResult CreateApplicationPolicy(string org, string app)
        {
            return Created($"/designer/api/{org}/{app}/apppolicy", new ResourcePolicy());
        }

        private ValidationProblemDetails ValidatePolicy(ResourcePolicy policy)
        {

           if(policy.Rules == null || policy.Rules.Count == 0)
            {
                ModelState.AddModelError("policy.rules", "policyerror.norules");
            }

            int ruleIndex = 0;
            foreach (PolicyRule rule in policy.Rules)
            {
                if (rule.Subject == null || rule.Subject.Count == 0)
                {
                    ModelState.AddModelError($"policy.rules[{ruleIndex}]", "policyerror.missingsubject");
                }

                if (rule.Actions == null || rule.Actions.Count == 0)
                {
                    ModelState.AddModelError($"policy.rules[{ruleIndex}]", "policyerror.missingaction");
                }

                if (rule.Resources == null || rule.Resources.Count == 0)
                {
                    ModelState.AddModelError($"policy.rules[{ruleIndex}]", "policyerror.missingresource");
                }

                ruleIndex++;
            }

            ValidationProblemDetails details = ProblemDetailsFactory.CreateValidationProblemDetails(HttpContext, ModelState);

            return details;
        }
    }
}
