using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The persons controller
    /// </summary>
    [Route("api/v1/[controller]")]
    public class PersonsController : Controller
    {
        /// <summary>
        /// Gets the person for a given ssn
        /// </summary>
        /// <param name="ssn">The ssn</param>
        /// <returns>The information about a given person</returns>
        [HttpGet("{ssn}")]
        public IActionResult Get(string ssn)
        {
            return Ok("Getting person");
        }
    }
}
