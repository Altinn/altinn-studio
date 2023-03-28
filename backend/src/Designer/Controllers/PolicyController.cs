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
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        public ActionResult UpdateApplicationPolicy(string org, string app, [FromBody] ResourcePolicy applicationPolicy)
        {
            XacmlPolicy xacmlPolicy = PolicyConverter.ConvertPolicy(applicationPolicy);

            _repository.SavePolicy(org, app, null, xacmlPolicy);

            return Ok(applicationPolicy);
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
    }
}
