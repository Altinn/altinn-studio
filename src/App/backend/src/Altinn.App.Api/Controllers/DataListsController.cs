using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Represents the DataLists API.
/// </summary>
[ApiController]
public class DataListsController : ControllerBase
{
    private readonly IDataListsService _dataListsService;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsController"/> class.
    /// </summary>
    /// <param name="dataListsService">Service for handling datalists</param>
    public DataListsController(IDataListsService dataListsService)
    {
        _dataListsService = dataListsService;
    }

    /// <summary>
    /// Api that exposes app related datalists
    /// </summary>
    /// <param name="id">The listId</param>
    /// <param name="queryParams">Query parameters supplied</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>The data list</returns>
    [HttpGet]
    [Route("/{org}/{app}/api/datalists/{id}")]
    public async Task<IActionResult> Get(
        [FromRoute] string id,
        [FromQuery] Dictionary<string, string> queryParams,
        [FromQuery] string? language = null
    )
    {
        DataList dataLists = await _dataListsService.GetDataListAsync(id, language, queryParams);
        if (dataLists.ListItems == null)
        {
            return NotFound();
        }

        return Ok(dataLists);
    }

    /// <summary>
    /// Exposes datalists related to the app and logged in user
    /// </summary>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="id">The datalistId</param>
    /// <param name="queryParams">Query parameters supplied</param>
    /// <param name="language">The language selected by the user.</param>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [Route("/{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/datalists/{id}")]
    public async Task<IActionResult> Get(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string id,
        [FromQuery] Dictionary<string, string> queryParams,
        [FromQuery] string? language = null
    )
    {
        var instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);

        DataList dataLists = await _dataListsService.GetDataListAsync(instanceIdentifier, id, language, queryParams);

        if (dataLists.ListItems == null)
        {
            return NotFound();
        }

        return Ok(dataLists);
    }
}
