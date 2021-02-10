using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Events.Controllers
{
    /// <summary>
    /// Controller to handle administration of event subscriptions
    /// </summary>
    [Route("events/api/v1/subscription")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionController"/> class.
        /// </summary>
        public SubscriptionController()
        {
        }

        /// <summary>
        /// Method to register an event
        /// </summary>
        /// <param name="eventsSubscription">The subscription details</param>
        /// <returns></returns>
        public async Task<ActionResult<string>> Post([FromBody] EventsSubscription eventsSubscription)
        {
            return Ok();
        }
    }
}
