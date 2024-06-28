using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to options (code lists).
/// </summary>
[ApiController]
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
    /// Fetches a list of the static option lists belonging to the app.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <returns>Array of option lists. Empty array if none are found</returns>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<string[]> GetOptionListIds(string org, string repo)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        string[] optionLists = _optionsService.GetOptionListIds(org, repo, developer);

        return Ok(optionLists);
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
    [Route("{optionListId}")]
    public async Task<ActionResult<List<Option>>> GetSingleOptionList(string org, string repo, [FromRoute] string optionListId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            List<Option> optionList = await _optionsService.GetOptions(org, repo, developer, optionListId);
            return Ok(optionList);
        }
        catch (NotFoundException)
        {
            return NotFound($"The options file {optionListId}.json does not exist.");
        }
    }

    /// <summary>
    /// Create an option list
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionListId">Name of the new option list</param>
    /// <param name="payload">The option list contents</param>
    /// <returns>The created option list</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [Route("{optionListId}")]
    public async Task<ActionResult> Post(string org, string repo, [FromRoute] string optionListId, [FromBody] List<Option> payload)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool optionListAlreadyExists = await _optionsService.OptionListExists(org, repo, developer, optionListId);
        if (optionListAlreadyExists)
        {
            return Conflict("The option list already exists.");
        }

        var newOptionList = await _optionsService.UpdateOptions(org, repo, developer, optionListId, payload);
        return CreatedAtAction("GetSingleOptionList", new { org, repo, optionListId }, newOptionList);
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{optionListId}")]
    public async Task<ActionResult> Put(string org, string repo, [FromRoute] string optionListId, [FromBody] List<Option> payload)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var newOptionList = await _optionsService.UpdateOptions(org, repo, developer, optionListId, payload);

        return Ok(newOptionList);
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
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Route("{optionListId}")]
    public async Task<ActionResult> Delete(string org, string repo, [FromRoute] string optionListId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool optionListExists = await _optionsService.OptionListExists(org, repo, developer, optionListId);
        if (!optionListExists)
        {
            return NotFound($"The options file {optionListId}.json does not exist.");
        }

        _optionsService.DeleteOptions(org, repo, developer, optionListId);
        return Ok($"The options file {optionListId}.json was successfully deleted.");
    }
}
