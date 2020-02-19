using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    [Route("{org}/{app}/api/options/")]
    [ApiController]
    public class OptionsController : ControllerBase
    {
        // GET: api/Options/5
        [HttpGet("{id}", Name = "Get")]
        public string Get(int id)
        {
            return "value";
        }
    }
}
