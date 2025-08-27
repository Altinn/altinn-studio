using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for resources
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/text")]
    [Obsolete("TextController is deprecated, please use TextsController instead. Only in use until new texts format is implemented in apps.")]
    public class TextController : Controller
    {
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly ITextsService _textsService;
        private readonly IMediator _mediator;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextController"/> class.
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service.</param>
        /// <param name="repositoryService">The app repository service.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        /// <param name="textsService">The texts service</param>
        /// <param name="mediator">the mediator.</param>
        public TextController(IWebHostEnvironment hostingEnvironment, IRepository repositoryService, IHttpContextAccessor httpContextAccessor, ILogger<TextController> logger, ITextsService textsService, IMediator mediator)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repositoryService;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _textsService = textsService;
            _mediator = mediator;
        }

        /// <summary>
        /// The languages in the app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpGet]
        [Route("languages")]
        public IActionResult GetLanguages(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            List<string> languages = _textsService.GetLanguages(org, app, developer);
            return Json(languages);
        }

        /// <summary>
        /// Returns the a JSON resource file for the given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        [Route("language/{languageCode}")]
        public async Task<ActionResult<TextResource>> GetResource(string org, string app, string languageCode)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                TextResource textResource = await _textsService.GetText(org, app, developer, languageCode);
                return Ok(textResource);
            }
            catch (NotFoundException)
            {
                return NotFound($"Text resource, resource.{languageCode}.json, could not be found.");
            }

        }

        /// <summary>
        /// Save a resource file
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code> )</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        [Route("language/{languageCode}")]
        public async Task<ActionResult> SaveResource([FromBody] TextResource jsonData, string languageCode, string org, string app)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                await _textsService.SaveText(org, app, developer, jsonData, languageCode);
                return Ok($"Text resource, resource.{languageCode}.json, was successfully saved.");
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
            catch (NotFoundException)
            {
                return NotFound($"Text resource, resource.{languageCode}.json, could not be found.");
            }
        }

        /// <summary>
        /// Method to update multiple texts for given keys and a given
        /// language in the text resource files in the old format.
        /// Non-existing keys will be added.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="keysTexts">List of Key/Value pairs that should be updated or added if not present.</param>
        /// <param name="languageCode">The languageCode for the text resource file that is being edited.</param>
        /// <remarks>Temporary method that should live until old text format is replaced by the new.</remarks>
        [HttpPut]
        [Route("language/{languageCode}")]
        public async Task<IActionResult> UpdateTextsForKeys(string org, string app, [FromBody] Dictionary<string, string> keysTexts, string languageCode)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                TextResource textResource = await _textsService.UpdateTextsForKeys(org, app, developer, keysTexts, languageCode);
                return Ok(textResource);

            }
            catch (ArgumentException exception)
            {
                return BadRequest(exception.Message);
            }
            catch (Exception)
            {
                return BadRequest($"The text resource, resource.{languageCode}.json, could not be updated.");
            }
        }

        /// <summary>
        /// Method to update multiple key-names
        /// Non-existing keys will be added.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="mutations">List of oldId: string, newId: string tuples to change or remove in all text-resource-files.</param>
        /// <remarks>If the newId is empty or undefined it implies that it is going to be removed</remarks>
        /// <remarks>Temporary method that should live until old text format is replaced by the new.</remarks>
        [HttpPut("keys")]
        public async Task<IActionResult> UpdateKeyNames(string org, string app, [FromBody] List<TextIdMutation> mutations)
        {
            bool mutationHasOccured = false;
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                IList<string> langCodes = _textsService.GetLanguages(org, app, developer);
                foreach (string languageCode in langCodes)
                {
                    TextResource textResourceObject = await _textsService.GetText(org, app, developer, languageCode);

                    foreach (TextIdMutation m in mutations)
                    {
                        if (m.OldId == "appName" || m.OldId == "serviceName")
                        {
                            throw new ArgumentException("You can not change the key representing the name of the application.");
                        }

                        int originalEntryIndex =
                            textResourceObject.Resources.FindIndex(textResourceElement =>
                                textResourceElement.Id == m.OldId);
                        if (originalEntryIndex == -1)
                        {
                            continue;
                        }

                        TextResourceElement textEntry = textResourceObject.Resources[originalEntryIndex];
                        if (m.NewId.HasValue && m.NewId.Value != "") // assign new key/id
                        {
                            textEntry.Id = m.NewId.Value;
                        }
                        else
                        {
                            textResourceObject.Resources.Remove(textEntry); //remove
                        }

                        mutationHasOccured = true;
                    }

                    await _mediator.Publish(new LanguageTextsKeyChangedEvent
                    {
                        IdMutations = mutations,
                        EditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer)
                    });
                    await _textsService.SaveText(org, app, developer, textResourceObject, languageCode);
                }
            }
            catch (ArgumentException exception)
            {
                return BadRequest(exception.Message);
            }
            catch (Exception e)
            {
                return BadRequest($"The update could not be done:\n{e.StackTrace}");
            }

            return Ok(mutationHasOccured ? "The IDs were updated." : "Nothing was changed.");
        }

        /// <summary>
        /// Deletes a language resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>Deletes a language resource</returns>
        [HttpDelete]
        [Route("language/{languageCode}")]
        public IActionResult DeleteLanguage(string org, string app, string languageCode)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            if (_repository.DeleteLanguage(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), languageCode))
            {
                return Ok($"Resources.{languageCode}.json was successfully deleted.");
            }

            return BadRequest($"Resource.{languageCode}.json could not be deleted.");
        }
    }
}
