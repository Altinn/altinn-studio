#nullable enable
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Storage.Controllers;

/// <summary>
/// API for handling locking and unlocking of data elements
/// </summary>
[Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/lock")]
[ApiController]
public class DataLockController : ControllerBase
{
    private readonly IInstanceRepository _instanceRepository;
    private readonly IDataRepository _dataRepository;
    private readonly IAuthorization _authorizationService;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataLockController"/> class
    /// </summary>
    /// <param name="instanceRepository">the instance repository</param>
    /// <param name="dataRepository">the data repository handler</param>
    /// <param name="authorizationService">the authorization service.</param>
    public DataLockController(
        IInstanceRepository instanceRepository,
        IDataRepository dataRepository,
        IAuthorization authorizationService)
    {
        _instanceRepository = instanceRepository;
        _dataRepository = dataRepository;
        _authorizationService = authorizationService;
    }

    /// <summary>
    /// Locks a data element
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to delete.</param>
    /// <returns>DataElement that was locked</returns>
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> Lock(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
    {
        (Instance? instance, ActionResult? instanceError) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
        if (instance == null)
        {
            return instanceError!;
        }

        DataElement? dataElement = instance.Data.Find(d => d.Id == dataGuid.ToString());

        if (dataElement?.Locked is true)
        {
            return Ok(dataElement);
        }

        Dictionary<string, object> propertyList = new()
        {
            { "/locked", true }
        };

        try
        {
            DataElement updatedDataElement = await _dataRepository.Update(instanceGuid, dataGuid, propertyList);
            return Created(updatedDataElement.Id, updatedDataElement);
        }
        catch (RepositoryException e)
        {
            return e.StatusCodeSuggestion != null ? StatusCode((int)e.StatusCodeSuggestion) : StatusCode(500);
        }
    }

    /// <summary>
    /// Unlocks a data element
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
    /// <param name="dataGuid">The id of the data element to delete.</param>
    /// <returns>DataElement that was unlocked</returns>
    [Authorize]
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [Produces("application/json")]
    public async Task<ActionResult<DataElement>> Unlock(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
    {
        (Instance? instance, _) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
        if (instance == null)
        {
            return Forbid();
        }

        bool authorized = await _authorizationService.AuthorizeAnyOfInstanceActions(instance, new List<string>() { "write", "unlock", "reject" });
        if (!authorized)
        {
            return Forbid();
        }

        Dictionary<string, object> propertyList = new()
        {
            { "/locked", false }
        };
        try
        {
            DataElement updatedDataElement = await _dataRepository.Update(instanceGuid, dataGuid, propertyList);
            return Ok(updatedDataElement);
        }
        catch (RepositoryException e)
        {
            return e.StatusCodeSuggestion != null ? StatusCode((int)e.StatusCodeSuggestion) : StatusCode(500);
        }
    }

    private async Task<(Instance? Instance, ActionResult? ErrorMessage)> GetInstanceAsync(Guid instanceGuid, int instanceOwnerPartyId)
    {
        Instance instance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);

        if (instance == null)
        {
            return (null, NotFound($"Unable to find any instance with id: {instanceOwnerPartyId}/{instanceGuid}."));
        }

        return (instance, null);
    }
}
