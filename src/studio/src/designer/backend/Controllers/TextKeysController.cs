using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
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
    [Route("designer/api/v1/{org}/{repo}/keys")]
    public class TextKeysController : ControllerBase
    {
        private readonly ILanguagesService _languagesService;
        private readonly ITextsService _textsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="LanguagesController"/> class.
        /// </summary>
        /// <param name="languagesService">The languages service.</param>
        /// <param name="textsService">The texts service.</param>
        public TextKeysController(ILanguagesService languagesService, ITextsService textsService)
        {
            _languagesService = languagesService;
            _textsService = textsService;
        }

        /// <summary>
        /// Endpoint for getting a list of all keys.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <returns>List of keys</returns>
        [HttpGet]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [Route("keys")]
        public async Task<ActionResult<List<string>>> Get(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IList<string> languages = _languagesService.GetLanguages(org, repo, developer);

            try
            {
                List<string> keys = await _textsService.GetKeys(org, repo, developer, languages);
                return Ok(keys);
            }
            catch (IOException)
            {
                return NotFound($"The texts files needed to get keys does not exist.");
            }
            catch (JsonException)
            {
                return new ObjectResult(new { errorMessage = $"The format of the file, .texts.json, that you tried to access might be invalid." }) { StatusCode = 500 };
            }
        }
    }
}
