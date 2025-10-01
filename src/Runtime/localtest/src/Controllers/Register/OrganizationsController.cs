using System.Threading.Tasks;

using Altinn.Platform.Register.Models;

using LocalTest.Services.Register.Interface;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The organizations controller provides access to organization information in the SBL Register component.
    /// </summary>
    [Authorize]
    [Route("register/api/v1/organizations")]
    public class OrganizationsController : Controller
    {
        private readonly IOrganizations _organizationsWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationsController"/> class.
        /// </summary>
        /// <param name="organizationsWrapper">The organizations wrapper used as a client when calling the SBLBridge.</param>
        public OrganizationsController(IOrganizations organizationsWrapper)
        {
            _organizationsWrapper = organizationsWrapper;
        }

        /// <summary>
        /// Gets the organization information for a given organization number.
        /// </summary>
        /// <param name="orgNr">The organization number to retrieve information about.</param>
        /// <returns>The information about a given organization.</returns>
        [HttpGet("{orgNr}")]
        [ProducesResponseType(404)]
        [ProducesResponseType(200)]
        [Produces("application/json")]
        public async Task<ActionResult<Organization>> Get(string orgNr)
        {
            Organization result = await _organizationsWrapper.GetOrganization(orgNr);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
    }
}
