using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace LocalTest.Controllers.Events
{
    /// <summary>
    /// Controller to handle administration of event subscriptions
    /// </summary>
    [Route("events/api/v1/subscriptions")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _eventsSubscriptionService;
        private readonly IMapper _mapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionController"/> class.
        /// </summary>
        public SubscriptionController(ISubscriptionService eventsSubscriptionService, IMapper mapper)
        {
            _eventsSubscriptionService = eventsSubscriptionService;
            _mapper = mapper;            
        }

        /// <summary>
        /// Register an subscription for events.
        /// </summary>
        /// <remarks>
        /// Requires information about endpoint to post events for subscribers.
        /// </remarks>
        /// <param name="eventsSubscriptionRequest">The subscription details</param>
        [HttpPost]
        //[Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [Produces("application/json")]
        public async Task<ActionResult<Subscription>> Post([FromBody] SubscriptionRequestModel eventsSubscriptionRequest)
        {
            Subscription eventsSubscription = _mapper.Map<Subscription>(eventsSubscriptionRequest);

            (Subscription createdSubscription, ServiceError error) = await _eventsSubscriptionService.CreateSubscription(eventsSubscription);

            if (error != null)
            {
                return StatusCode(error.ErrorCode, error.ErrorMessage);
            }

            return Created("/events/api/v1/subscription/" + createdSubscription.Id, createdSubscription);
        }

    }
}
