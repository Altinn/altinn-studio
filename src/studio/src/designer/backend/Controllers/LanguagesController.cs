using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to languages and text-resources
    /// </summary>
    /// <remarks>
    /// Should not be confused with TextController.cs (singular). This class
    /// handles text resources written in the new format with key-value pairs.
    /// </remarks>
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
        /// Controller to handle the languages in the app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpGet]
        public ActionResult<List<string>> GetLanguages(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            List<string> languages = _languagesService.GetLanguages(org, repo, developer);

            string jsonLanguages = JsonSerializer.Serialize(languages);

            return Ok(jsonLanguages);
        }
    }
}
