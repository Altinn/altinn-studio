using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions related to text files in the
    /// new format; texts.*.json with key:value pairs.
    /// </summary>
    /// <remarks>
    /// NB: Must not be confused with TextController (singular)
    /// which interacts with the text files in the old format.
    /// </remarks>
    [Authorize]

    //[AutoValidateAntiforgeryToken]
    [Route("designer/api/v2/{org}/{repo}/texts")]
    public class TextsController : ControllerBase
    {
        private readonly ITextsService _textsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextsController"/> class.
        /// </summary>
        /// <param name="textsService">The texts service.</param>
        public TextsController(ITextsService textsService)
        {
            _textsService = textsService;
        }

        /// <summary>
        /// Endpoint for getting the complete text file for a specific language.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">Language identifier specifying the text file to read.</param>
        /// <returns>Text file</returns>
        /// <remarks>If duplicates of keys are tried added the
        /// deserialization to dictionary will overwrite the first
        /// key:value pair with the last key:value pair</remarks>
        [HttpGet]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [Route("{languageCode}")]
        public async Task<ActionResult<Dictionary<string, string>>> Get(string org, string repo, [FromRoute] string languageCode)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                Dictionary<string, string> texts = await _textsService.GetTexts(org, repo, developer, languageCode);
                return Ok(texts);
            }
            catch (IOException)
            {
                return new ObjectResult(new { errorMessage = $"The texts file, texts.{languageCode}.json, that you are trying to find does not exist." }) { StatusCode = 404 };
            }
            catch (JsonException)
            {
                return new ObjectResult(new { errorMessage = $"The format of the file, texts.{languageCode}.json, that you tried to access might be invalid." }) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Endpoint for updating a text file for a specific language.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">Language identifier specifying the text file to read.</param>
        /// <param name="jsonTexts">New content from request body to be added to the text file.</param>
        /// <remarks>If duplicates of keys are tried added the
        /// deserialization to dictionary will overwrite the first
        /// key:value pair with the last key:value pair</remarks>
        [HttpPut]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Route("{languageCode}")]
        public async Task<ActionResult> Put(string org, string repo, string languageCode, [FromBody] Dictionary<string, string> jsonTexts)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            if (jsonTexts == null)
            {
                return new ObjectResult(new { errorMessage = $"The texts file, texts.{languageCode}.json, that you are trying to add have invalid format." }) { StatusCode = 400 };
            }

            await _textsService.UpdateTexts(org, repo, developer, languageCode, jsonTexts);

            return NoContent();
        }

        /// <summary>
        /// Endpoint for deleting a specific language in the application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">Language identifier.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpDelete]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("{languageCode}")]
        public ActionResult<bool> Delete(string org, string repo, [FromRoute] string languageCode)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            bool deleted = _textsService.DeleteTexts(org, repo, developer, languageCode);

            if (!deleted)
            {
                return NotFound($"The file texts.{languageCode}.json is not found or already deleted.");
            }

            return Ok($"Texts file, texts.{languageCode}.json, was successfully deleted.");
        }
    }
}
