using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Controllers
{
    [Route("api/v1/[controller]")]
    public class DebugController : Controller
    {
        private readonly AzureCosmosSettings _cosmosettings;

        public DebugController(IOptions<AzureCosmosSettings> cosmosettings)
        {
            _cosmosettings = cosmosettings.Value;
        }

        [HttpGet("debug")]
        public async Task<ActionResult> Debug() 
        {
            return Ok(_cosmosettings.EndpointUri);
        }
    }
}
