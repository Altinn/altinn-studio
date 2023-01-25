using System.Collections.Generic;

using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions related to languages
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/v1/{org}/{repo}/languages")]
    public class LanguagesController : ControllerBase
    {
        private readonly ILanguagesService _languagesService;

        /// <summary>
        /// Initializes a new instance of the <see cref="LanguagesController"/> class.
        /// </summary>
        /// <param name="languagesService">The languages service.</param>
        public LanguagesController(ILanguagesService languagesService)
        {
            _languagesService = languagesService;
        }

        /// <summary>
        /// Endpoint for getting the available languages in the application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpGet]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<string>> GetLanguages(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            List<string> languages = new List<string>(_languagesService.GetLanguages(org, repo, developer));

            return Ok(languages);
        }
    }
}
