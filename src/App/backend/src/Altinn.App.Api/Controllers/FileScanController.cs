#nullable disable
using Altinn.App.Api.Models;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Contains actions for checking status on file scans.
/// </summary>
[Authorize]
[ApiController]
public class FileScanController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;

    /// <summary>
    /// Initialises a new instance of the <see cref="FileScanController"/> class
    /// </summary>
    public FileScanController(IInstanceClient instanceClient)
    {
        _instanceClient = instanceClient;
    }

    /// <summary>
    /// Checks that file scan result for an instance and it's data elements.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
    /// <param name="instanceGuid">Unique id to identify the instance</param>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/filescanresult")]
    public async Task<ActionResult<InstanceFileScanResult>> GetFileScanResults(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance == null)
        {
            return NotFound();
        }

        return Ok(MapFromInstance(instance));
    }

    private static InstanceFileScanResult MapFromInstance(Instance instance)
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(instance));

        if (instance.Data != null)
        {
            foreach (var dataElement in instance.Data)
            {
                instanceFileScanResult.AddFileScanResult(
                    new DataElementFileScanResult() { Id = dataElement.Id, FileScanResult = dataElement.FileScanResult }
                );
            }
        }

        return instanceFileScanResult;
    }
}
