using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Services.Interface;
using Common.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to the Actor model
    /// </summary>
    [Route("authorization/api/v1/actors")]
    [ApiController]
    public class ActorsController : ControllerBase
    {
        private readonly IActor _actorWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ActorsController"/> class
        /// </summary>
        public ActorsController(IActor actorWrapper)
        {
            _actorWrapper = actorWrapper;
        }

        [HttpGet]
        public async Task<ActionResult> Get(int userId)
        {
            List<Actor> actorList = await _actorWrapper.GetActors(userId);
            if (actorList == null || actorList.Count == 0)
            {
                return NotFound();
            }

            return Ok(actorList);
        }
    }
}
