#nullable enable
using System.Diagnostics;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Storage.Controllers;

/// <summary>
/// Handles operations for the application instance locks
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="InstanceLockController"/> class
/// </remarks>
/// <param name="instanceRepository">the instance repository handler</param>
/// <param name="instanceLockRepository">the instance lock repository</param>
/// <param name="authorizationService">the authorization service</param>
/// <param name="logger">the logger</param>
[Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/lock")]
[ApiController]
public class InstanceLockController(
    IInstanceRepository instanceRepository,
    IInstanceLockRepository instanceLockRepository,
    IAuthorization authorizationService,
    ILogger<InstanceLockController> logger
) : ControllerBase
{
    private const string _lockTokenHeader = "Altinn-Storage-Lock-Token";

    /// <summary>
    /// Attempts to acquire a lock for an instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to lock.</param>
    /// <param name="request">The lock request containing expiration time.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The lock response with lock key if successful, or Conflict if lock is already held.</returns>
    [Authorize]
    [HttpPost]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [Produces("application/json")]
    public async Task<ActionResult<InstanceLockResponse>> AcquireInstanceLock(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        [FromBody] InstanceLockRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.TtlSeconds < 0)
        {
            return Problem(
                detail: "TtlSeconds cannot be negative.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var userOrOrgNo = User.GetUserOrOrgNo();

        if (userOrOrgNo is null)
        {
            return Problem(
                detail: "User identity could not be determined.",
                statusCode: StatusCodes.Status403Forbidden
            );
        }

        (Instance instance, _) = await instanceRepository.GetOne(
            instanceGuid,
            false,
            cancellationToken
        );

        if (instance is null || instance.InstanceOwner.PartyId != instanceOwnerPartyId.ToString())
        {
            return Problem(
                detail: "Instance not found.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        var atLeastOneActionAuthorized = await AuthorizeInstanceLock(instance);

        if (!atLeastOneActionAuthorized)
        {
            return Problem(
                detail: "Not authorized to acquire instance lock.",
                statusCode: StatusCodes.Status403Forbidden
            );
        }

        var (result, lockToken) = await instanceLockRepository.TryAcquireLock(
            instanceGuid,
            request.TtlSeconds,
            userOrOrgNo,
            cancellationToken
        );

        return result switch
        {
            AcquireLockResult.Success => Ok(
                new InstanceLockResponse { LockToken = lockToken!.CreateToken() }
            ),
            AcquireLockResult.LockAlreadyHeld => Problem(
                detail: "Lock is already held for this instance.",
                statusCode: StatusCodes.Status409Conflict
            ),
            _ => throw new UnreachableException(),
        };
    }

    /// <summary>
    /// Updates TTL on an instance lock.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to lock.</param>
    /// <param name="request">The lock request (TTL should be 0 for release).</param>
    /// <param name="lockTokenHeader">The lock token used for authorizing access to the lock.</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>NoContent if successful.</returns>
    [Authorize]
    [HttpPatch]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [Produces("application/json")]
    public async Task<ActionResult> UpdateInstanceLock(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        [FromBody] InstanceLockRequest request,
        [FromHeader(Name = _lockTokenHeader)] string lockTokenHeader,
        CancellationToken cancellationToken
    )
    {
        LockToken lockToken;
        try
        {
            lockToken = LockToken.ParseToken(lockTokenHeader);
        }
        catch (FormatException e)
        {
            logger.LogWarning(message: "Could not parse lock token.", exception: e);
            return Problem(
                detail: "Could not parse lock token.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        if (request.TtlSeconds < 0)
        {
            return Problem(
                detail: "TtlSeconds cannot be negative.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        (Instance instance, _) = await instanceRepository.GetOne(
            instanceGuid,
            false,
            cancellationToken
        );

        if (instance is null || instance.InstanceOwner.PartyId != instanceOwnerPartyId.ToString())
        {
            return Problem(
                detail: "Instance not found.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        var result = await instanceLockRepository.TryUpdateLockExpiration(
            lockToken,
            instanceGuid,
            request.TtlSeconds,
            cancellationToken
        );

        return result switch
        {
            UpdateLockResult.Success => NoContent(),
            UpdateLockResult.LockNotFound => Problem(
                detail: "Lock not found.",
                statusCode: StatusCodes.Status404NotFound
            ),
            UpdateLockResult.LockExpired => Problem(
                detail: "Lock has expired.",
                statusCode: StatusCodes.Status422UnprocessableEntity
            ),
            UpdateLockResult.TokenMismatch => Problem(
                detail: "Lock token is invalid.",
                statusCode: StatusCodes.Status403Forbidden
            ),
            _ => throw new UnreachableException(),
        };
    }

    private async Task<bool> AuthorizeInstanceLock(Instance existingInstance)
    {
        string[] actionsThatAllowLock =
        [
            .. ProcessController.GetActionsThatAllowProcessNextForTaskType(
                existingInstance.Process?.CurrentTask?.AltinnTaskType
            ),
            "reject",
        ];
        var taskId = existingInstance.Process?.CurrentTask?.ElementId;

        foreach (string action in actionsThatAllowLock)
        {
            bool actionIsAuthorized = await authorizationService.AuthorizeInstanceAction(
                existingInstance,
                action,
                taskId
            );
            if (actionIsAuthorized)
            {
                return true;
            }
        }

        return false;
    }
}
