using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/policy")]
    public class PolicyController : ControllerBase
    {
        private readonly IRepository _repository;

        public PolicyController(IRepository repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Gets the application policy, url Get "/designer/api/org/app/
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The updated application metadata</returns>
        [HttpGet]
        [Route("")]
        public ActionResult GetAppPolicy(string org, string app)
        {
            XacmlPolicy xacmlPolicy = _repository.GetPolicy(org, app, null);

            ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);

            return Ok(resourcePolicy);
        }


        /// <summary>
        /// Gets the resource policy, url PUT "/designer/api/org/app/{resoruceid}
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resourceid">The resource Id for the connected policy</param>
        /// <returns>The updated application metadata</returns>
        [HttpGet]
        [Route("{resourceid}")]
        public ActionResult GetResourcePolicy(string org, string app, string resourceid)
        {
            XacmlPolicy xacmlPolicy = _repository.GetPolicy(org, app, resourceid);

            ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);

            return Ok(resourcePolicy);
        }


        /// <summary>
        /// Puts the application policy, url PUT "/designer/api/org/app/apppolicy
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationPolicy">The application metadata</param>
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        [HttpPost]
        [Route("")]
        public ActionResult UpdateApplicationPolicy(string org, string app, [FromBody] ResourcePolicy applicationPolicy)
        {
            XacmlPolicy xacmlPolicy = PolicyConverter.ConvertPolicy(applicationPolicy);

            _repository.SavePolicy(org, app, null, xacmlPolicy);

            return Ok(applicationPolicy);
        }

        /// <summary>
        /// Puts the resource policy, url PUT "/designer/api/org/app/apppolicy
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationPolicy">The application metadata</param>
        /// <param name="resourceid">The resource Id for the connected policy</param>
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        [HttpPost]
        [Route("{resourceid}")]
        public ActionResult UpdateResourcePolicy(string org, string app, string resourceid, [FromBody] ResourcePolicy applicationPolicy)
        {
            XacmlPolicy xacmlPolicy = PolicyConverter.ConvertPolicy(applicationPolicy);

            _repository.SavePolicy(org, app, resourceid, xacmlPolicy);

            return Ok(applicationPolicy);
        }

        [HttpGet]
        [Route("validate")]
        public ActionResult ValidateAppPolicy(string org, string app)
        {
            XacmlPolicy xacmlPolicy = _repository.GetPolicy(org, app, null);

            ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);
            ValidationProblemDetails vpd = ValidatePolicy(resourcePolicy);
            if (vpd.Errors.Count == 0)
            {
                vpd.Status = 200;
            }
            return Ok(vpd);
        }

        [HttpGet]
        [Route("validate/{resourceid}")]
        public ActionResult ValidateResourcePolicy(string org, string app, string resourceid)
        {
            XacmlPolicy xacmlPolicy = _repository.GetPolicy(org, app, resourceid);

            ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);
            ValidationProblemDetails vpd = ValidatePolicy(resourcePolicy);
            if (vpd.Errors.Count == 0)
            {
                vpd.Status = 200;
            }
            return Ok(vpd);
        }

        private ValidationProblemDetails ValidatePolicy(ResourcePolicy policy)
        {

            if (policy.Rules == null || policy.Rules.Count == 0)
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
