using System;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions for reading and writing the prefill configuration file
/// (&lt;model&gt;.prefill.json) belonging to a data model.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/datamodels")]
public class PrefillController : ControllerBase
{
    private readonly IPrefillService _prefillService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PrefillController"/> class.
    /// </summary>
    /// <param name="prefillService">Interface for working with prefill configuration files.</param>
    public PrefillController(IPrefillService prefillService)
    {
        _prefillService = prefillService;
    }

    /// <summary>
    /// Method that returns the JSON contents of the prefill configuration file belonging to a specific datamodel.
    /// </summary>
    /// <param name="org">the org owning the models repo</param>
    /// <param name="repository">the model repos</param>
    /// <param name="modelPath">The path to the data model schema file the prefill configuration belongs to.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [Route("prefill")]
    public async Task<ActionResult<string>> Get(
        [FromRoute] string org,
        [FromRoute] string repository,
        [FromQuery] string modelPath,
        CancellationToken cancellationToken
    )
    {
        var decodedPath = Uri.UnescapeDataString(modelPath);

        var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
        var json = await _prefillService.GetPrefill(editingContext, decodedPath, cancellationToken);

        if (json is null)
        {
            return NoContent();
        }

        return Ok(json);
    }

    /// <summary>
    /// Creates or updates the prefill configuration file belonging to the specified datamodel in the git repository.
    /// </summary>
    /// <param name="org">The org owning the repository.</param>
    /// <param name="repository">The repository name</param>
    /// <param name="payload">Prefill configuration JSON payload</param>
    /// <param name="modelPath">The path to the data model schema file the prefill configuration belongs to.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [UseSystemTextJson]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [Route("prefill")]
    public async Task<IActionResult> Put(
        string org,
        string repository,
        [FromBody] JsonNode payload,
        [FromQuery] string modelPath,
        CancellationToken cancellationToken = default
    )
    {
        var decodedPath = Uri.UnescapeDataString(modelPath);
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string content = payload.ToString();

        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);

        await _prefillService.SavePrefill(editingContext, decodedPath, content, cancellationToken);

        return NoContent();
    }
}
