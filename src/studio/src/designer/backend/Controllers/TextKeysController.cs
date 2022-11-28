using System;
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
    /// Controller containing actions related to text keys
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/v1/{org}/{repo}/keys")]
    public class TextKeysController : ControllerBase
    {
        private readonly ILanguagesService _languagesService;
        private readonly ITextsService _textsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextKeysController"/> class.
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
        public async Task<ActionResult<List<string>>> Get(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IList<string> languages = _languagesService.GetLanguages(org, repo, developer);

            try
            {
                List<string> keys = await _textsService.GetKeys(org, repo, developer, languages);
                return Ok(keys);
            }
            catch (JsonException)
            {
                return new ObjectResult(new { errorMessage = "The format of one or more texts files that you tried to access might be invalid." }) { StatusCode = 500 };
            }
            catch (IOException)
            {
                return NotFound("The texts files needed to add key could not be found or does not exist.");
            }
        }

        /// <summary>
        /// Endpoint for posting a single key to the texts files for all languages.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <param name="newKey">Key to be added to the texts files.</param>
        /// <returns>KeyValuePair of new key and an empty text.</returns>
        [HttpPost]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<KeyValuePair<string, string>>> Post(string org, string repo, [FromQuery] string newKey)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IList<string> languages = _languagesService.GetLanguages(org, repo, developer);

            try
            {
                KeyValuePair<string, string> keyValuePair = await _textsService.AddKey(org, repo, developer, languages, newKey);
                return Ok(keyValuePair);
            }
            catch (JsonException)
            {
                return new ObjectResult(new { errorMessage = "The format of one or more texts files that you tried to access might be invalid." }) { StatusCode = 500 };
            }
            catch (IOException)
            {
                return NotFound("The texts files needed to add key could not be found or does not exist.");
            }
        }

        /// <summary>
        /// Endpoint for changing or deleting a single key in the texts files for all languages.
        /// If deleting, an empty string is sent as "newKey". Key and belonging value is
        /// deleted from all texts files.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Application identifier which is unique within an organisation.</param>
        /// <param name="oldKey">Old key to be replaced.</param>
        /// <param name="newKey">New key to replace the old.</param>
        /// <returns>KeyValuePair of new key and belonging text.</returns>
        [HttpPut]
        [Produces("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<KeyValuePair<string, string>>> Put(string org, string repo, [FromQuery] string oldKey, [FromQuery] string newKey)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IList<string> languages = _languagesService.GetLanguages(org, repo, developer);

            try
            {
                KeyValuePair<string, string> keyValuePair =
                    await _textsService.UpdateKey(org, repo, developer, languages, oldKey, newKey);
                return Ok(keyValuePair);
            }
            catch (JsonException)
            {
                return new ObjectResult(new { errorMessage = "The format of one or more texts files that you tried to access might be invalid." }) { StatusCode = 500 };
            }
            catch (BadHttpRequestException errorMessage)
            {
                return BadRequest(errorMessage);
            }
            catch (IOException)
            {
                return NotFound("The texts files needed to update key could not be found or does not exist.");
            }
        }
    }
}
