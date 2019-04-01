using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The organizations controller
    /// </summary>
    [Route("api/v1/[controller]")]
    public class OrganizationsController : Controller
    {
        /// <summary>
        /// Gets the organization for a given organization nr
        /// </summary>
        /// <param name="orgNr">The organization nr</param>
        /// <returns>The information about a given organization</returns>
        [HttpGet("{orgNr}")]
        public IActionResult Get(int orgNr)
        {
            return Ok("Getting organization");
        }
    }
}
