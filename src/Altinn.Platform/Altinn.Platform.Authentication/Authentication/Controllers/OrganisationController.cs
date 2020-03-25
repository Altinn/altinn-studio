using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Repositories;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Fetches valid organisation data of requests to platform
    /// </summary>
    [Route("authentication/api/v1")]
    [ApiController]
    public class OrganisationController : ControllerBase
    {
        private readonly ILogger<OrganisationController> logger;
        private readonly IOrganisationRepository organisationRepository;

        /// <summary>
        /// Creates a organisation controller.
        /// </summary>
        public OrganisationController(ILogger<OrganisationController> logger, IOrganisationRepository organisationRepository)
        {
            this.logger = logger;
            this.organisationRepository = organisationRepository;
        }

        /// <summary>
        /// Returns an organisation resource with the organisation number identifier.
        /// </summary>
        /// <param name="orgNumber">Organisation number</param>
        /// <param name="org">Organisation identifier. Usually a 2-4 character abbreviation of organisation name</param>
        /// <returns>an organisation</returns>
        [HttpGet("organisations")]
        public async Task<ActionResult> GetOrganisation([FromQuery] int? orgNumber, [FromQuery] string org)
        {
            Organisation organisation;

            if (orgNumber.HasValue)
            {
                organisation = await organisationRepository.GetOrganisationByOrgNumber(orgNumber.ToString());
            }
            else if (!string.IsNullOrEmpty(org))
            {
                organisation = await organisationRepository.GetOrganisationByOrg(org);
            }
            else
            {
                return BadRequest("You need to provide either a valid org or a valid orgNumber query parameter");
            }

            if (organisation == null)
            {
                return NotFound();
            }

            return Ok(organisation);
        }      
    }
}
