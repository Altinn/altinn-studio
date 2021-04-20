using System;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Platform.Register.Filters;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The parties controller provides access to party information in the SBL Register component.
    /// </summary>
    [Authorize]
    [Authorize(Policy = "PlatformAccess")]
    [Route("register/api/v1/parties")]
    public class PartiesController : Controller
    {
        private readonly IParties _partiesWrapper;
        private readonly IAuthorization _authorization;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class.
        /// </summary>
        /// <param name="partiesWrapper">The parties wrapper used as a client when calling SBL Bridge.</param>
        /// <param name="authorizationWrapper">The authorization wrapper</param>
        public PartiesController(IParties partiesWrapper, IAuthorization authorizationWrapper)
        {
            _partiesWrapper = partiesWrapper;
            _authorization = authorizationWrapper;
        }

        /// <summary>
        /// Gets the party for a given party id.
        /// </summary>
        /// <param name="partyId">The party id.</param>
        /// <returns>The information about a given party.</returns>
        [HttpGet("{partyId:int}")]
        [ProducesResponseType(404)]
        [ProducesResponseType(200)]
        [Produces("application/json")]
        public async Task<ActionResult<Party>> Get(int partyId)
        {
            if (!IsOrg(HttpContext))
            {
                int? userId = GetUserId(HttpContext);
                bool? isValid = false;
                if (userId.HasValue)
                {
                    isValid = await _authorization.ValidateSelectedParty(userId.Value, partyId);
                }

                if (!isValid.HasValue || !isValid.Value)
                {
                    return Unauthorized();
                }
            }

            Party result = await _partiesWrapper.GetParty(partyId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Perform a lookup/search for a specific party by using one of the provided ids.
        /// </summary>
        /// <param name="partyLookup">The lookup criteria. One and only one of the properties must be a valid value.</param>
        /// <returns>The identified party.</returns>
        [ValidateModelState]
        [HttpPost("lookup")]
        [Consumes("application/json")]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(200)]
        [Produces("application/json")]
        public async Task<ActionResult<Party>> PostPartyLookup([FromBody]PartyLookup partyLookup)
        {
            string lookupValue = partyLookup.OrgNo ?? partyLookup.Ssn;

            Party party = await _partiesWrapper.LookupPartyBySSNOrOrgNo(lookupValue);

            if (party == null)
            {
                return NotFound();
            }

            return Ok(party);
        }

        /// <summary>
        /// Validate if the authenticated identity is an org
        /// </summary>
        private static bool IsOrg(HttpContext context)
        {
            bool isOrg = false;

            foreach (Claim claim in context.User.Claims)
            {
                if (claim.Type.Equals(AltinnCoreClaimTypes.Org))
                {
                    isOrg = true;
                }
            }

            return isOrg;
        }

        /// <summary>
        /// Gets userId from httpContext
        /// </summary>
        private static int? GetUserId(HttpContext context)
        {
            foreach (Claim claim in context.User.Claims)
            {
                if (claim.Type.Equals(AltinnCoreClaimTypes.UserId))
                {
                    return Convert.ToInt32(claim.Value);
                }
            }

            return null;
        }
    }
}
