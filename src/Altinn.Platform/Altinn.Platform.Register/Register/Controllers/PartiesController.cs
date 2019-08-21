using System.Threading.Tasks;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The parties controller
    /// </summary>
    [Route("register/api/v1/[controller]")]
    public class PartiesController : Controller
    {
        private readonly IParties _partiesWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class
        /// </summary>
        /// <param name="partiesWrapper">The parties wrapper</param>
        public PartiesController(IParties partiesWrapper)
        {
            _partiesWrapper = partiesWrapper;
        }

        /// <summary>
        /// Gets the party for a given party id
        /// </summary>
        /// <param name="partyID">The party id</param>
        /// <returns>The information about a given party</returns>
        [HttpGet("{partyID}")]
        public async Task<ActionResult> Get(int partyID)
        {
            Party result = await _partiesWrapper.GetParty(partyID);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
    }
}
