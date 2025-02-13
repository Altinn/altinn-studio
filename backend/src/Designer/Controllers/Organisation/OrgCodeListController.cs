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
/// Controller containing actions related to code-lists on organisation level.
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/{org}/code-lists")]
public class OrgCodeListController : ControllerBase
{
    private readonly IOrgCodeListService _orgCodeListService;
    private const string Repo = "content";

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgCodeListController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The CodeList service for organisation level</param>
    public OrgCodeListController(IOrgCodeListService orgCodeListService)
    {
        _orgCodeListService = orgCodeListService;
    }

    /// <summary>
    /// Fetches the contents of all the code-lists belonging to the organisation.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of <see cref="OptionListData" /> objects with all code-lists belonging to the organisation with data
    /// set if code-list is valid, or hasError set if code-list is invalid.</returns>
    [HttpGet]
    public async Task<ActionResult<List<OptionListData>>> GetCodeLists(string org, CancellationToken cancellationToken = default)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            List<OptionListData> codeLists = await _orgCodeListService.GetCodeLists(org, Repo, developer, cancellationToken);

            return Ok(codeLists);
        }
        catch (NotFoundException)
        {
            return NoContent();
        }
    }

    /// <summary>
    /// Creates or overwrites a code list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code-list.</param>
    /// <param name="codeList">Contents of the code-list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPost]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{codeListId}")]
    public async Task<ActionResult<List<OptionListData>>> CreateCodeList(string org, [FromRoute] string codeListId, [FromBody] List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        List<OptionListData> codeLists = await _orgCodeListService.CreateCodeList(org, Repo, developer, codeListId, codeList, cancellationToken);

        return Ok(codeLists);
    }

    /// <summary>
    /// Creates or overwrites an code-list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code-list.</param>
    /// <param name="codeList">Contents of the code-list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("{codeListId}")]
    public async Task<ActionResult<List<OptionListData>>> UpdateCodeList(string org, [FromRoute] string codeListId, [FromBody] List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        List<OptionListData> codeLists = await _orgCodeListService.UpdateCodeList(org, Repo, developer, codeListId, codeList, cancellationToken);

        return Ok(codeLists);
    }

    /// <summary>
    /// Create new code-list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="file">File being uploaded.</param>
    /// <param name="cancellationToken"><see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPost]
    [Route("upload")]
    public async Task<ActionResult<List<OptionListData>>> UploadCodeList(string org, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            List<OptionListData> codeLists = await _orgCodeListService.UploadCodeList(org, Repo, developer, file, cancellationToken);
            return Ok(codeLists);
        }
        catch (JsonException e)
        {
            return BadRequest(e.Message);
        }
    }

    /// <summary>
    /// Deletes an code-list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code-list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpDelete]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("{codeListId}")]
    public async Task<ActionResult<List<OptionListData>>> DeleteCodeList(string org, [FromRoute] string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool CodeListExists = await _orgCodeListService.CodeListExists(org, Repo, developer, codeListId, cancellationToken);
        if (CodeListExists)
        {
            List<OptionListData> codeLists = await _orgCodeListService.DeleteCodeList(org, Repo, developer, codeListId, cancellationToken);
            return Ok(codeLists);
        }

        return Ok($"The code-list file {codeListId}.json has been deleted.");
    }
}
