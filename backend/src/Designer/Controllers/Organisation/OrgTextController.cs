using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

/// <summary>
/// Controller for text resources on organisation level
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/{org}/text")]
public class OrgTextController : ControllerBase
{
    private readonly IOrgTextsService _orgTextsService;
    private const string Repo = "content";

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgTextController"/> class.
    /// </summary>
    /// <param name="orgTextsService">The texts service.</param>
    public OrgTextController(IOrgTextsService orgTextsService)
    {
        _orgTextsService = orgTextsService;
    }

    /// <summary>
    /// Returns a JSON resource file for the given language code
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="languageCode">The resource language id (for example <code>nb, en</code>)</param>
    /// <returns>The JSON config</returns>
    [HttpGet]
    [Route("language/{languageCode}")]
    public async Task<ActionResult<TextResource>> GetResource(string org, string languageCode)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            TextResource textResource = await _orgTextsService.GetText(org, Repo, developer, languageCode);
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
    /// <returns>The updated resource file</returns>
    [HttpPost]
    [Route("language/{languageCode}")]
    public async Task<ActionResult<TextResource>> CreateResource([FromBody] TextResource jsonData, string languageCode, string org)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            await _orgTextsService.SaveText(org, Repo, developer, jsonData, languageCode);

            TextResource textResource = await _orgTextsService.GetText(org, Repo, developer, languageCode);
            return Ok(textResource);
        }
        catch (ArgumentException e)
        {
            return BadRequest(e.Message);
        }
    }

    /// <summary>
    /// Method to update multiple texts for given keys and a given
    /// language in the text resource files.
    /// Non-existing keys will be added.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="keysTexts">List of Key/Value pairs that should be updated or added if not present.</param>
    /// <param name="languageCode">The languageCode for the text resource file that is being edited.</param>
    /// <returns>The updated resource file</returns>
    [HttpPut]
    [Route("language/{languageCode}")]
    public async Task<ActionResult<TextResource>> UpdateResource(string org, [FromBody] Dictionary<string, string> keysTexts, string languageCode)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            await _orgTextsService.UpdateTextsForKeys(org, Repo, developer, keysTexts, languageCode);

            TextResource textResource = await _orgTextsService.GetText(org, Repo, developer, languageCode);
            return Ok(textResource);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (NotFoundException)
        {
            return BadRequest($"The text resource, resource.{languageCode}.json, could not be updated.");
        }
    }
}
