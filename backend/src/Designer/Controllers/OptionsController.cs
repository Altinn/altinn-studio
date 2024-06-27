using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to options (codelists).
/// </summary>
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/options")]
public class OptionsController : ControllerBase
{
    private readonly IOptionsService _optionsService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OptionsController"/> class.
    /// </summary>
    /// <param name="optionsService">The options service.</param>
    public OptionsController(IOptionsService optionsService)
    {
        _optionsService = optionsService;
    }

    /// <summary>
    /// Fetches a list the static option lists belonging to the app.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <returns>Array of option lists. Empty array if none are found</returns>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public string[] GetOptionListIds(string org, string repo)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        string[] optionLists = _optionsService.GetOptionListIds(org, repo, developer);

        return optionLists;
    }

    /// <summary>
    /// Fetches a specific option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionListId">Name of the option list.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Route("{optionListId}")]
    public async Task<ActionResult<List<Option>>> GetSingleOptionList(string org, string repo, [FromRoute] string optionListId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            List<Option> optionList = await _optionsService.GetOptions(org, repo, developer, optionListId);
            return Ok(optionList);
        }
        catch (IOException)
        {
            return NotFound($"The options file {optionListId}.json does not exist.");
        }
        catch (JsonException)
        {
            return new ObjectResult(new { errorMessage = $"The format of the file {optionListId}.json might be invalid." }) { StatusCode = 500 };
        }
    }

    /// <summary>
    /// Creates or overwrites an option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionListId">Name of the option list.</param>
    /// <param name="payload">Contents of the option list.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Route("{optionListId}")]
    public async Task<ActionResult> Put(string org, string repo, [FromRoute] string optionListId, [FromBody] List<Option> payload)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        if (payload == null || payload.Count == 0)
        {
            return BadRequest("The option list has an invalid format.");
        }

        try
        {
            var newOptionList = await _optionsService.UpdateOptions(org, repo, developer, optionListId, payload);
            return Ok(newOptionList);
        }
        catch (IOException)
        {
            return new ObjectResult(new { errorMessage = $"An error occurred while saving the file {optionListId}.json." }) { StatusCode = 500 };
        }
    }

    /// <summary>
    /// Deletes an option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionListId">Name of the option list.</param>
    [HttpDelete]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("{optionListId}")]
    public ActionResult<string> Delete(string org, string repo, [FromRoute] string optionListId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        _optionsService.DeleteOptions(org, repo, developer, optionListId);

        return Ok($"The options file {optionListId}.json was successfully deleted.");
    }
}
