using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The parties controller
    /// </summary>
    [Route("api/v1/[controller]")]
    public class PartiesController : Controller
    {
        /// <summary>
        /// Gets the party for a given party id
        /// </summary>
        /// <param name="partyID">The party id</param>
        /// <returns>The information about a given party</returns>
        [HttpGet("{partyID}")]
        public IActionResult Get(int partyID)
        {
            return Ok("Getting party");
        }
    }
}
