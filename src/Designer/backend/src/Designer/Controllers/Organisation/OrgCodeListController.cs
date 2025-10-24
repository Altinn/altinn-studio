#nullable enable
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.CodeList;
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
/// Controller containing actions related to code lists on organisation level.
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/{org}/code-lists")]
public class OrgCodeListController : ControllerBase
{
    private readonly IOrgCodeListService _orgCodeListService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgCodeListController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The CodeList service for organisation level</param>
    public OrgCodeListController(IOrgCodeListService orgCodeListService)
    {
        _orgCodeListService = orgCodeListService;
    }

    /// <summary>
    /// Fetches the contents of all the code lists belonging to the organisation.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of <see cref="OptionListData" /> objects with all code lists belonging to the organisation with data
    /// set if code list is valid, or hasError set if code list is invalid.</returns>
    [HttpGet]
    public async Task<ActionResult<List<OptionListData>>> GetCodeLists(string org, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            List<OptionListData> codeLists = await _orgCodeListService.GetCodeLists(org, developer, cancellationToken);

            return Ok(codeLists);
        }
        catch (NotFoundException)
        {
            return NoContent();
        }
    }

    /// <summary>
    /// Fetches the contents of all the code lists belonging to the organisation.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of <see cref="CodeListWrapper" /> which includes all code lists belonging to the organisation.</returns>
    [HttpGet]
    [Route("new")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<GetCodeListResponse>> GetCodeListsNew(string org, [FromQuery] string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        GetCodeListResponse response = await _orgCodeListService.GetCodeListsNew(org, reference, cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Creates or overwrites the code lists.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="requestBody">The body of the request <see cref="UpdateCodeListRequest"/></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("new")]
    public async Task<ActionResult> UpdateCodeListsNew(string org, [FromBody] UpdateCodeListRequest requestBody, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            await _orgCodeListService.UpdateCodeListsNew(org, developer, requestBody, cancellationToken);
            return Ok();
        }
        catch (Exception ex) when (ex is IllegalFileNameException or IllegalCommitMessageException)
        {
            return BadRequest(ex.Message);
        }

    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [Route("new/publish")]
    public async Task<ActionResult> PublishCodeList(string org, [FromBody] PublishCodeListRequest requestBody, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await _orgCodeListService.PublishCodeList(org, requestBody, cancellationToken);
            return Ok();
        }
        catch (Exception ex) when (ex is ConfigurationErrorsException or IllegalFileNameException or ArgumentNullException)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Creates or overwrites a code list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code list.</param>
    /// <param name="codeList">Contents of the code list.</param>
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

        List<OptionListData> codeLists = await _orgCodeListService.CreateCodeList(org, developer, codeListId, codeList, cancellationToken);

        return Ok(codeLists);
    }

    /// <summary>
    /// Creates or overwrites a code list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code list.</param>
    /// <param name="codeList">Contents of the code list.</param>
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

        List<OptionListData> codeLists = await _orgCodeListService.UpdateCodeList(org, developer, codeListId, codeList, cancellationToken);

        return Ok(codeLists);
    }

    [HttpPut]
    [Route("change-name/{codeListId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult UpdateCodeListId(string org, [FromRoute] string codeListId, [FromBody] string newCodeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            _orgCodeListService.UpdateCodeListId(org, developer, codeListId, newCodeListId);
            return Ok();
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    /// <summary>
    /// Create new code list.
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
            List<OptionListData> codeLists = await _orgCodeListService.UploadCodeList(org, developer, file, cancellationToken);
            return Ok(codeLists);
        }
        catch (JsonException e)
        {
            return BadRequest(e.Message);
        }
    }

    /// <summary>
    /// Deletes a code list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="codeListId">Name of the code list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpDelete]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [Route("{codeListId}")]
    public async Task<ActionResult<List<OptionListData>>> DeleteCodeList(string org, [FromRoute] string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        bool codeListExists = await _orgCodeListService.CodeListExists(org, developer, codeListId, cancellationToken);
        if (!codeListExists)
        {
            return NotFound($"The code list file {codeListId}.json does not exist.");
        }

        List<OptionListData> codeLists = await _orgCodeListService.DeleteCodeList(org, developer, codeListId, cancellationToken);
        return Ok(codeLists);
    }
}
