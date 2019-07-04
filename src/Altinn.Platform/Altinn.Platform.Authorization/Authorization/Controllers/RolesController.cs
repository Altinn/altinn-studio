using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.ServiceLibrary.Models;
using Authorization.Interface.Models;
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
        [HttpGet]
        public async Task<ActionResult> Get()
        {
            List<Role> roleList = null;
            UserContext userContext = ContextHelper.GetUserContext(HttpContext);
            if (userContext != null && userContext.UserId != 0 && userContext.PartyId != 0)
            {
                roleList = await _rolesWrapper.GetDecisionPointRolesForUser(userContext.UserId, userContext.PartyId);
            }

            if (roleList == null || roleList.Count == 0)
            {
                return NotFound();
            }

            return Ok(roleList);
        }
    }
}
