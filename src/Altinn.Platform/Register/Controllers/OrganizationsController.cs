using System.Threading.Tasks;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The organizations controller
    /// </summary>
    [Route("api/v1/[controller]")]
    public class OrganizationsController : Controller
    {
        private readonly IOrganizations _organizationsWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationsController"/> class
        /// </summary>
        /// <param name="organizationsWrapper">The organizations wrapper</param>
        public OrganizationsController(IOrganizations organizationsWrapper)
        {
            _organizationsWrapper = organizationsWrapper;
        }

        /// <summary>
        /// Gets the organization for a given organization nr
        /// </summary>
        /// <param name="orgNr">The organization nr</param>
        /// <returns>The information about a given organization</returns>
        [HttpGet("{orgNr}")]
        public async Task<ActionResult> Get(string orgNr)
        {
            Organization result = await _organizationsWrapper.GetOrganization(orgNr);
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }
    }
}
