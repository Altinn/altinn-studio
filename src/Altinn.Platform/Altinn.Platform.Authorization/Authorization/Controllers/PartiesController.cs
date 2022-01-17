using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authenticaiton.Extensions;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to the party
    /// </summary>
    [Route("authorization/api/v1/parties")]
    [ApiController]
    public class PartiesController : ControllerBase
    {
        private readonly IParties _partiesWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class
        /// </summary>
        public PartiesController(IParties partiesWrapper)
        {
            _partiesWrapper = partiesWrapper;
        }

        /// <summary>
        /// Gets the list of parties that the logged in user can represent
        /// </summary>
        /// <param name="userId">the user id</param>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult> GetPartyList(int userId)
        {
            List<Party> partyList = null;
            int? authnUserId = User.GetUserIdAsInt();

            if (userId != authnUserId)
            {
                return Forbid();
            }

            if (userId != 0)
            {
                partyList = await _partiesWrapper.GetParties(userId);
            }

            if (partyList == null || partyList.Count == 0)
            {
                return NotFound();
            }
            else
            {
                return Ok(partyList);
            }
        }

        /// <summary>
        /// Verifies that the user can represent the given party
        /// </summary>
        /// <param name="userId">The user id"</param>
        /// <param name="partyId">The party id"</param>
        [HttpGet("{partyId}/validate")]
        public async Task<ActionResult> ValidateSelectedParty(int userId, int partyId)
        {
            if (userId == 0 || partyId == 0)
            {
                return NotFound();
            }

            bool isValidParty = await _partiesWrapper.ValidateSelectedParty(userId, partyId);

            return Ok(isValidParty);
        }
    }
}
