using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Hanldes application metadata
    /// AllowAnonymous, because this is static known information and used from LocalTest
    /// </summary>
    [AllowAnonymous]
    [ApiController]
    public class ApplicationMetadataController : ControllerBase
    {
        private readonly IAppResources _appResources;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class
        /// <param name="appResources">The app resources service</param>
        /// </summary>
        public ApplicationMetadataController(IAppResources appResources)
        {
            _appResources = appResources;
        }

        /// <summary>
        /// Get the application metadata
        ///
        /// If org and app does not match, this returns a 409 Conflict response
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="checkOrgApp">Boolean get parameter to skip verification of correct org/app</param>
        /// <returns>Application metadata</returns>
        [HttpGet("{org}/{app}/api/v1/applicationmetadata")]
        public IActionResult GetAction(string org, string app, [FromQuery] bool checkOrgApp = true)
        {
            Application application = _appResources.GetApplication();

            if (application != null)
            {
                string wantedAppId = $"{org}/{app}";

                if (!checkOrgApp || application.Id.Equals(wantedAppId))
                {
                    return Ok(application);
                }

                return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
            }

            return NotFound();
        }

        /// <summary>
        /// Get the application XACML policy file
        ///
        /// If org and app does not match, this returns a 409 Conflict response
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>XACML policy file</returns>
        [HttpGet("{org}/{app}/api/v1/meta/authorizationpolicy")]
        public IActionResult GetPolicy(string org, string app)
        {
            Application application = _appResources.GetApplication();
            string policy = _appResources.GetApplicationXACMLPolicy();

            if (application != null && policy != null)
            {
                string wantedAppId = $"{org}/{app}";

                if (application.Id.Equals(wantedAppId))
                {
                    return Content(policy, "text/xml", System.Text.Encoding.UTF8);
                }

                return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
            }

            return NotFound();
        }

        /// <summary>
        /// Get the application BPMN process file
        ///
        /// If org and app does not match, this returns a 409 Conflict response
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>BPMN process file</returns>
        [HttpGet("{org}/{app}/api/v1/meta/process")]
        public IActionResult GetProcess(string org, string app)
        {
            Application application = _appResources.GetApplication();
            string process = _appResources.GetApplicationBPMNProcess();

            if (application != null && process != null)
            {
                string wantedAppId = $"{org}/{app}";

                if (application.Id.Equals(wantedAppId))
                {
                    return Content(process, "text/xml", System.Text.Encoding.UTF8);
                }

                return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
            }

            return NotFound();
        }
    }
}
