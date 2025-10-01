using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Handles operations for signing all or a subset of dataelements for an instance
    /// </summary>
    [Route("storage/api/v1/instances")]
    [ApiController]
    public class SignController : ControllerBase
    {
        private readonly IInstanceService _instanceService;

        /// <summary>
        /// Initializes a new instance of the <see cref="SignController"/> class
        /// </summary>
        /// <param name="instanceService">A instance service with instance related business logic.</param>
        public SignController(IInstanceService instanceService)
        {
            _instanceService = instanceService;
        }

        /// <summary>
        /// Create signature document from listed data elements
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The guid of the instance</param>
        /// <param name="signRequest">Signrequest containing data element ids and sign status</param>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_SIGN)]
        [HttpPost("{instanceOwnerPartyId:int}/{instanceGuid:guid}/sign")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult> Sign([FromRoute] int instanceOwnerPartyId, [FromRoute] Guid instanceGuid, [FromBody] SignRequest signRequest)
        {
            if (string.IsNullOrEmpty(signRequest?.Signee?.UserId) && signRequest?.Signee?.SystemUserId is null)
            {
                return Problem("The 'UserId' or 'SystemUserId' parameter must be defined for signee.", null, 400);
            }

            var performedBy = User.GetUserOrOrgNo();
            if (string.IsNullOrEmpty(performedBy))
            {
                return Unauthorized();
            }

            (bool created, ServiceError serviceError) = await _instanceService.CreateSignDocument(instanceOwnerPartyId, instanceGuid, signRequest, performedBy);
            
            if (created)
            {
                return StatusCode(201, "SignDocument is created");
            }

            return Problem(serviceError.ErrorMessage, null, serviceError.ErrorCode);
        }
    }
}