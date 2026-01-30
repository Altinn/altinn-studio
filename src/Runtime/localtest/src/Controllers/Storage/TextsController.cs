using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Controllers;

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
    /// Creates a new text resource
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the application</param>
    /// <param name="textResource">the text resource to be stored</param>
    /// <returns>the created resource</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Produces("application/json")]
    [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
    public async Task<ActionResult<TextResource>> Create(
        string org,
        string app,
        [FromBody] TextResource textResource
    )
    {
        if (!LanguageHelper.IsTwoLetters(textResource.Language))
        {
            return BadRequest("The language must be a two letter ISO language name.");
        }

        var createdObjected = await _textRepository.Create(org, app, textResource);
        return Ok(createdObjected);
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

    /// <summary>
    /// Updates an existing text
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the app</param>
    /// <param name="language">the language, must be a two letter ISO name</param>
    /// <param name="textResource">the text resource</param>
    /// <returns>the updated text</returns>
    [HttpPut("{language}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
    public async Task<ActionResult<TextResource>> Update(
        string org,
        string app,
        string language,
        [FromBody] TextResource textResource
    )
    {
        if (!LanguageHelper.IsTwoLetters(textResource.Language))
        {
            return BadRequest("The language must be a two letter ISO language name.");
        }

        if (!language.Equals(textResource.Language))
        {
            return BadRequest(
                $"The language specified in the textResource {textResource.Language} does not match the api path: {language}"
            );
        }

        TextResource updatedResource = await _textRepository.Update(org, app, textResource);
        return Ok(updatedResource);
    }

    /// <summary>
    /// Deletes an existing text
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the app</param>
    /// <param name="language">the language, must be a two letter ISO name</param>
    [HttpDelete("{language}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
    public async Task<ActionResult> Delete(string org, string app, string language)
    {
        TextResource existingResource = await _textRepository.Get(org, app, language);
        if (existingResource == null)
        {
            return NotFound();
        }

        bool deleted = await _textRepository.Delete(org, app, language);
        if (deleted)
        {
            return Ok();
        }
        else
        {
            _logger.LogError(
                "Unable to delete text resource for {org}/{app}",
                org.RemoveNewlines(),
                app.RemoveNewlines()
            );
            return StatusCode(500, $"Unable to delete text resource for {org}/{app}");
        }
    }
}
