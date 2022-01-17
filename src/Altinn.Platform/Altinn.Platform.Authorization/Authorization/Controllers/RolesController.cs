using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authenticaiton.Extensions;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Platform.Authorization.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to the roles model
    /// </summary>
    [Route("authorization/api/v1/roles")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly IRoles _rolesWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="RolesController"/> class
        /// </summary>
        public RolesController(IRoles rolesWrapper)
        {
            _rolesWrapper = rolesWrapper;
        }

        /// <summary>
        /// Get the decision point roles for the loggedin user for a selected party
        /// </summary>
        /// <param name="coveredByUserId">the logged in user id</param>
        /// <param name="offeredByPartyId">the partyid of the person/org the logged in user is representing</param>
        /// <returns></returns>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult> Get(int coveredByUserId, int offeredByPartyId)
        {
            int? authnUserId = User.GetUserIdAsInt();

            if (coveredByUserId != authnUserId)
            {
                return Forbid();
            }

            if (coveredByUserId == 0 || offeredByPartyId == 0)
            {
                return BadRequest();
            }

            List<Role> roleList = await _rolesWrapper.GetDecisionPointRolesForUser(coveredByUserId, offeredByPartyId);

            if (roleList == null || roleList.Count == 0)
            {
                return NotFound();
            }

            return Ok(roleList);
        }
    }
}
