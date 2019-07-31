using System.Threading.Tasks;
using Altinn.Platform.Config.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Config.Controllers
{
    /// <summary>
    /// Contains all actions related to subscriptions
    /// </summary>
    [Route("config/api/v1/subscriptions")]
    [ApiController]
    public class SubscriptionsController : Controller
    {
        private readonly ISubscriptions _subscriptionsWrappper;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionsController"/> class
        /// </summary>
        public SubscriptionsController(ISubscriptions subscriptionsWrappper)
        {
            _subscriptionsWrappper = subscriptionsWrappper;
        }

        /// <summary>
        /// Checks if there is a valid subscription for a given party and service
        /// </summary>
        /// <param name="partyId">the party id</param>
        ///  <param name="serviceCode">the service code</param>
        ///   <param name="serviceEditionCode">the service edition code</param>
        [HttpGet]
        public async Task<ActionResult> ValidateSubscription(int partyId, string serviceCode, int serviceEditionCode)
        {
            bool result;

            if (partyId == 0 || serviceCode == null || serviceEditionCode == 0)
            {
                return BadRequest();
            }

            result = await _subscriptionsWrappper.ValidateSubscription(partyId, serviceCode, serviceEditionCode);

            return Ok(result);
        }

        /// <summary>
        /// Debug controller for testing purposes.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> Debug(string echo)
        {
            return Ok($"You have reached the subscription controller. Echo: {echo}");
        }
    }
}
