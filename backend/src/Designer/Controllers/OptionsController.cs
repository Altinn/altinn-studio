using System.Collections.Generic;
using System.Threading;
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
[Route("api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/options")]
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
    /// Fetches the IDs of the options lists belonging to the app.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <returns>Array of options list's IDs. Empty array if none are found</returns>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<string[]> GetOptionsListIds(string org, string repo)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        string[] optionsListIds = _optionsService.GetOptionsListIds(org, repo, developer);

        return Ok(optionsListIds);
    }

    /// <summary>
    /// Fetches a specific option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionsListId">Name of the option list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Route("{optionsListId}")]
    public async Task<ActionResult<List<Option>>> GetOptionsList(string org, string repo, [FromRoute] string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            List<Option> optionsList = await _optionsService.GetOptionsList(org, repo, developer, optionsListId, cancellationToken);
            return Ok(optionsList);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>
    /// Creates or overwrites an options list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionsListId">Name of the options list.</param>
    /// <param name="payload">Contents of the options list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{optionsListId}")]
    public async Task<ActionResult> CreateOrOverwriteOptionsList(string org, string repo, [FromRoute] string optionsListId, [FromBody] List<Option> payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var newOptionsList = await _optionsService.CreateOrOverwriteOptionsList(org, repo, developer, optionsListId, payload, cancellationToken);

        return Ok(newOptionsList);
    }

    /// <summary>
    /// Deletes an option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionsListId">Name of the option list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpDelete]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("{optionsListId}")]
    public async Task<ActionResult> DeleteOptionsList(string org, string repo, [FromRoute] string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool optionsListExists = await _optionsService.OptionsListExists(org, repo, developer, optionsListId, cancellationToken);
        if (optionsListExists)
        {
            _optionsService.DeleteOptionsList(org, repo, developer, optionsListId);
        }

        return Ok($"The options file {optionsListId}.json has been deleted.");
    }
}
