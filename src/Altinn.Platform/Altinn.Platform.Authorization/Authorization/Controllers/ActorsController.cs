using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.ServiceLibrary.Models;
using Authorization.Interface.Models;
using Microsoft.AspNetCore.Mvc;

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

        /// <summary>
        /// Gets the list of actors that the logged in user can represent
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> Get()
        {
            List<Actor> actorList = null;
            UserContext userContext = ContextHelper.GetUserContext(HttpContext);

            if (userContext != null && userContext.UserId != 0)
            {
                actorList = await _actorWrapper.GetActors(userContext.UserId);
            }

            if (actorList == null || actorList.Count == 0)
            {
                return NotFound();
            }
            else
            {
                return Ok(actorList);
            }            
        }

        /// <summary>
        /// Dummy api for testing
        /// </summary>
        [HttpGet("test")]
        public ActionResult GetValues()
        {
            List<Actor> actorList = new List<Actor>();

            Actor testActor = new Actor()
            {
                SSN = "123456",
                Name = "test",
                PartyID = 54321
            };

            actorList.Add(testActor);

            return Ok(actorList);
        }
    }
}
