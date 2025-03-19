using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.Options;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
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
    private readonly IOrgCodeListService _orgCodeListService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OptionsController"/> class.
    /// </summary>
    /// <param name="optionsService">The options service.</param>
    /// <param name="orgCodeListService">The code list service on org level.</param>
    public OptionsController(IOptionsService optionsService, IOrgCodeListService orgCodeListService)
    {
        _optionsService = optionsService;
        _orgCodeListService = orgCodeListService;
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
    /// Fetches the contents of all the options lists belonging to the app.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <returns>List of <see cref="OptionListData" /> objects with all option lists belonging to the app with data
    /// set if option list is valid, or hasError set if option list is invalid.</returns>
    [HttpGet]
    [Route("option-lists")]
    public async Task<ActionResult<List<OptionListData>>> GetOptionLists(string org, string repo)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            string[] optionListIds = _optionsService.GetOptionsListIds(org, repo, developer);
            List<OptionListData> optionLists = [];
            foreach (string optionListId in optionListIds)
            {
                try
                {
                    List<Option> optionList = await _optionsService.GetOptionsList(org, repo, developer, optionListId);
                    OptionListData optionListData = new()
                    {
                        Title = optionListId,
                        Data = optionList,
                        HasError = false
                    };
                    optionLists.Add(optionListData);
                }
                catch (InvalidOptionsFormatException)
                {
                    OptionListData optionListData = new()
                    {
                        Title = optionListId,
                        Data = null,
                        HasError = true
                    };
                    optionLists.Add(optionListData);
                }
            }
            return Ok(optionLists);
        }
        catch (NotFoundException)
        {
            return NoContent();
        }
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
    /// Gets all usages of all optionListIds in the layouts as <see cref="RefToOptionListSpecifier"/>.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("usage")]
    public async Task<ActionResult<List<RefToOptionListSpecifier>>> GetOptionListsReferences(string org, string repo, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        List<RefToOptionListSpecifier> optionListReferences = await _optionsService.GetAllOptionListReferences(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer), cancellationToken);
        return Ok(optionListReferences);
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
    public async Task<ActionResult<List<Option>>> CreateOrOverwriteOptionsList(string org, string repo, [FromRoute] string optionsListId, [FromBody] List<Option> payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var newOptionsList = await _optionsService.CreateOrOverwriteOptionsList(org, repo, developer, optionsListId, payload, cancellationToken);

        return Ok(newOptionsList);
    }

    /// <summary>
    /// Updates the name of an options list by changing file name in repo.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionsListId">Name of the options list.</param>
    /// <param name="newOptionsListId">New name of options list file.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("change-name/{optionsListId}")]
    public ActionResult UpdateOptionsListId(string org, string repo, [FromRoute] string optionsListId, [FromBody] string newOptionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
        try
        {
            _optionsService.UpdateOptionsListId(editingContext, optionsListId, newOptionsListId, cancellationToken);
        }
        catch (IOException exception)
        {
            return BadRequest(exception.Message);
        }

        return Ok();
    }

    /// <summary>
    /// Create new options list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="file">File being uploaded.</param>
    /// <param name="cancellationToken"><see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPost]
    [Route("upload")]
    public async Task<IActionResult> UploadFile(string org, string repo, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string fileName = file.FileName.Replace(".json", "");

        try
        {
            List<Option> newOptionsList = await _optionsService.UploadNewOption(org, repo, developer, fileName, file, cancellationToken);
            return Ok(newOptionsList);
        }
        catch (JsonException e)
        {
            return BadRequest(e.Message);
        }
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

    [HttpPost]
    [Route("{optionsListId}/import")]
    public async Task<ActionResult<List<OptionListData>>> ImportOptionListFromOrg(string org, string repo, [FromRoute] string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool codeListExists = await _orgCodeListService.CodeListExists(org, developer, optionsListId, cancellationToken);
        if (!codeListExists)
        {
            return NotFound($"The code list file {optionsListId}.json does not exist.");
        }

        List<Option> newOptionsList = await _optionsService.ImportOptionListFromOrg(org, repo, developer, optionsListId, cancellationToken);

        if (newOptionsList is null)
        {
            return Conflict($"The options file {optionsListId}.json already exists.");
        }

        return Ok(newOptionsList);
    }
}
