using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Hanldes application metadata
    /// </summary>
    [Authorize]
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
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Application metadata</returns>
        [Authorize]
        [HttpGet("{org}/{app}/api/v1/applicationmetadata")]
        public IActionResult GetAction(string org, string app)
        {
            Application application = _appResources.GetApplication();

            if (application != null)
            {
                string wantedAppId = $"{org}/{app}";

                if (application.Id.Equals(wantedAppId))
                {
                    return Ok(application);
                }

                return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
            }

            return NotFound();
        }
    }
}
