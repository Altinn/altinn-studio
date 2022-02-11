#nullable enable
using System;
using System.Linq;
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
        private readonly IPersonLookup _personLookup;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsController"/> class.
        /// </summary>
        /// <param name="personLookup">An implementation of the <see cref="IPersonLookup"/> service.</param>
        public PersonsController(IPersonLookup personLookup)
        {
            _personLookup = personLookup;
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
        public async Task<ActionResult<Person>> GetPerson(PersonLookupIdentifiers personLookup)
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

            Person? person;
            try
            {
                person = await _personLookup.GetPerson(
                    personLookup.NationalIdentityNumber, personLookup.LastName, userId.Value);
            }
            catch (TooManyFailedLookupsException)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests);
            }

            if (person is null)
            {
                return NotFound();
            }

            return person;
        }

        private static int? GetUserId(HttpContext context)
        {
            Claim? userIdClaim = context.User.Claims.FirstOrDefault(c => c.Type.Equals(AltinnCoreClaimTypes.UserId));

            return userIdClaim is not null ? Convert.ToInt32(userIdClaim.Value) : null;
        }
    }
}
