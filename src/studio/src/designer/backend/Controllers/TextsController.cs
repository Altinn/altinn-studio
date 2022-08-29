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
    /// Controller containing actions related to text files in the
    /// new format; text.*.json with key:value pairs.
    /// </summary>
    /// <remarks>
    /// NB: Must not be confused with TextController (singular)
    /// which interacts with the text files in the old format.
    /// </remarks>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/v2/{org}/{repo}/texts")]
    public class TextsController : ControllerBase
    {
        private readonly ITextsService _textsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextsController"/> class.
        /// </summary>
        /// <param name="textsService">The languages service.</param>
        public TextsController(ITextsService textsService)
        {
            _textsService = textsService;
        }

        /// <summary>
        /// Endpoint for getting a text file in a specific language.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpGet]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("{languageCode}")]
        public async Task<ActionResult<string>> GetText(string org, string repo, [FromRoute] string languageCode)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            ActionResult<string> text = await _textsService.GetTextContent(org, repo, developer, languageCode);

            string jsonText = JsonSerializer.Serialize(text);

            return Ok(jsonText);
        }

    }
}
