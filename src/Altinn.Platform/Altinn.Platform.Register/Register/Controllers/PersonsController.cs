#nullable enable
using System;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Platform.Register.Core;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The <see cref="PersonsController"/> provides the API endpoints related to persons.
    /// </summary>
    [Authorize(Policy = "PlatformAccess")]
    [Route("register/api/v1/persons")]
    public class PersonsController : ControllerBase
    {
        private readonly IPersonLookup _personCheck;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsController"/> class.
        /// </summary>
        /// <param name="personCheck">An implementation of the <see cref="IPersonLookup"/> service.</param>
        public PersonsController(IPersonLookup personCheck)
        {
            _personCheck = personCheck;
        }

        /// <summary>
        /// Gets the party for the given national identity number.
        /// </summary>
        /// <remarks>
        /// This method can be used to retrieve the party and person object for an identified person with
        /// a national identity number. The service will track the number of invalid input combinations and
        /// block further requests if the number of failed lookups have exceeded a configurable number. The
        /// user will be prevented from performing new searches for a configurable number of seconds.
        /// </remarks>
        /// <returns>The party of the identified person.</returns>
        [HttpGet]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(200)]
        [Produces("application/json")]
        public async Task<ActionResult<Party>> GetPersonPartyAsync(PersonLookup personLookup)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            int? userId = GetUserId(HttpContext);

            if (userId is null)
            {
                return Forbid();
            }

            Party? party;
            try
            {
                party = await _personCheck.GetPersonParty(
                    personLookup.NationalIdentityNumber, personLookup.LastName, userId.Value);
            }
            catch (TooManyFailedLookupsException)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests);
            }

            if (party is null)
            {
                return NotFound();
            }

            return party;
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
