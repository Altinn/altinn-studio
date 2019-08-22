using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.Authentication.Constants;
using AltinnCore.ServiceLibrary.Models;
using Authorization.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
        public async Task<ActionResult> GetPartyList(int userId)
        {
            List<Party> partyList = null;

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

        /// <summary>
        /// Validates selected party and notifies SBL of the update
        /// </summary>
        /// <param name="partyId">aefghr</param>
        [HttpPut("{partyId}")]
        public async Task<ActionResult> UpdateSelectedParty(int partyId)
        {
            string userIdString = Request.HttpContext.User.Claims.Where(c => c.Type == AltinnCoreClaimTypes.UserId)
                .Select(c => c.Value).SingleOrDefault();
            int userId = int.Parse(userIdString);

            bool? result = await _partiesWrapper.UpdateSelectedParty(userId, partyId);

            if (result == null)
            {
                return BadRequest($"User {userId} cannot represent party { partyId}.");
            }

            if (result == false)
            {
               return StatusCode(500, "Something went wrong when trying to update selectedparty.");
            }

            return Ok("Party successfully updated.");
        }
    }
}
