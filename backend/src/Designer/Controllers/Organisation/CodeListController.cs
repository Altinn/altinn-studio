using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

/// <summary>
/// Controller containing actions related to options (code lists) on organisation level.
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/{org}/code-lists")]
public class CodeListController : ControllerBase
{
    private readonly ICodeListService _codeListService;
    private const string Repo = "content";

    /// <summary>
    /// Initializes a new instance of the <see cref="CodeListController"/> class.
    /// </summary>
    /// <param name="codeListService">The options service for organisation level</param>
    public CodeListController(ICodeListService codeListService)
    {
        _codeListService = codeListService;
    }

    /// <summary>
    /// Fetches the contents of all the options lists belonging to the app.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <returns>List of <see cref="OptionListData" /> objects with all option lists belonging to the app with data
    /// set if option list is valid, or hasError set if option list is invalid.</returns>
    [HttpGet]
    public async Task<ActionResult<List<OptionListData>>> GetCodeLists(string org)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            List<OptionListData> optionLists = await _codeListService.GetCodeLists(org, Repo, developer);
            return Ok(optionLists);
        }
        catch (NotFoundException)
        {
            return NoContent();
        }
    }

    /// <summary>
    /// Creates or overwrites an options list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="optionsListId">Name of the options list.</param>
    /// <param name="payload">Contents of the options list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPost]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{optionsListId}")]
    public async Task<ActionResult<List<Option>>> CreateCodeList(string org, [FromRoute] string optionsListId, [FromBody] List<Option> payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var newOptionsList = await _codeListService.CreateCodeList(org, Repo, developer, optionsListId, payload, cancellationToken);
        return Ok(newOptionsList);
    }

    /// <summary>
    /// Creates or overwrites an options list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="optionsListId">Name of the options list.</param>
    /// <param name="payload">Contents of the options list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{optionsListId}")]
    public async Task<ActionResult<List<OptionListData>>> UpdateCodeList(string org, [FromRoute] string optionsListId, [FromBody] List<Option> payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var newOptionsList = await _codeListService.UpdateCodeList(org, Repo, developer, optionsListId, payload, cancellationToken);
        return Ok(newOptionsList);
    }

    /// <summary>
    /// Create new options list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="file">File being uploaded.</param>
    /// <param name="cancellationToken"><see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPost]
    [Route("upload")]
    public async Task<ActionResult<List<OptionListData>>> UploadCodeList(string org, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string fileName = file.FileName.Replace(".json", "");

        try
        {
            List<OptionListData> newOptionsList = await _codeListService.UploadCodeList(org, Repo, developer, fileName, file, cancellationToken);
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
    /// <param name="optionsListId">Name of the option list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpDelete]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("{optionsListId}")]
    public async Task<ActionResult> DeleteCodeList(string org, [FromRoute] string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool optionsListExists = await _codeListService.CodeListExists(org, Repo, developer, optionsListId, cancellationToken);
        if (optionsListExists)
        {
            _codeListService.DeleteCodeList(org, Repo, developer, optionsListId);
        }

        return Ok($"The options file {optionsListId}.json has been deleted.");
    }
}
