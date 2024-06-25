using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Helpers;
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
    /// Endpoint for getting a specific option list.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repo">Application identifier which is unique within an organisation.</param>
    /// <param name="optionsListId">Options list identifier specifying the file to read.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [Route("{optionsListId}")]
    public async Task<ActionResult<List<Dictionary<string, string>>>> Get(string org, string repo, [FromRoute] string optionsListId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            List<Dictionary<string, string>> optionList = await _optionsService.GetOptions(org, repo, developer, optionsListId);
            return Ok(optionList);
        }
        catch (IOException)
        {
            return NotFound($"The options file {optionsListId}.json does not exist.");
        }
        catch (JsonException)
        {
            return new ObjectResult(new { errorMessage = $"The format of the file {optionsListId}.json might be invalid." }) { StatusCode = 500 };
        }
    }
}
