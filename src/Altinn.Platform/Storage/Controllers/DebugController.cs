using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Storage.Controllers
{
    [Route("api/v1/[controller]")]
    public class DebugController : Controller
    {
        [HttpGet("debug")]
        public async Task<ActionResult> Debug() 
        {
            return Ok("test");
        }
    }
}
