using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Provides operations for handling texts
    /// </summary>
    [ApiController]
    [Route("storage/api/v1/applications/{org}/{app}/texts")]
    public class TextsController : ControllerBase
    {
        private readonly ITextRepository _textRepository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextsController"/> class.
        /// </summary>
        /// <param name="textRepository">the text repository handler</param>
        /// <param name="logger">dependency injection of logger</param>
        public TextsController(ITextRepository textRepository, ILogger<TextsController> logger)
        {
            _textRepository = textRepository;
            _logger = logger;
        }

        /// <summary>
        /// Gets a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="language">the language, must be a two letter ISO name</param>
        /// <returns>the requested text resource if found</returns>
        [HttpGet("{language}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        [Authorize]
        public async Task<ActionResult<TextResource>> Get(string org, string app, string language)
        {
            try
            {
                if (!LanguageHelper.IsTwoLetters(language))
                {
                    return BadRequest("The language must be a two letter ISO language name.");
                }

                TextResource textResource = await _textRepository.Get(org, app, language);
                if (textResource == null)
                {
                    return NotFound();
                }

                return Ok(textResource);
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to get text resource for {org}/{app}: {e.Message}");
                return StatusCode(500, $"Unable to get text resource for {org}/{app}");
            }
        }
    }
}
