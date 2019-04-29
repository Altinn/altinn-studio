using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// The debug controller
    /// </summary>
    [Route("api/authentication/v1/[controller]")]
    public class DebugController : Controller
    {
        /// <summary>
        /// Gets the value passed to the controller.
        /// </summary>
        /// <param name="echo">The value passed.</param>
        /// <returns>The value passed to the controller.</returns>
        [HttpGet("{echo}")]
        public ActionResult Get(string echo)
        {
            if (echo == null)
            {
                return NotFound();
            }

            return Ok(echo);
        }
    }
}
