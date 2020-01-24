using System.Threading.Tasks;
using Altinn.Platform.Register.Models;
using LocalTest.Services.Register.Interface;
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
        [HttpGet("{partyID:int}")]
        public async Task<ActionResult> Get(int partyID)
        {
            Party result = await _partiesWrapper.GetParty(partyID);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Gets the party for a given social security number or organization number.
        /// </summary>
        /// <param name="lookupValue">SSN or OrgNumber.</param>
        /// <returns>The party represeting the provided SNN/OrgNumber.</returns>
        [HttpGet("lookupObject")]
        public async Task<ActionResult> LookupPartyBySSNOrOrgNo([FromBody]string lookupValue)
        {
            Party result = await _partiesWrapper.LookupPartyBySSNOrOrgNo(lookupValue);
            if (result != null)
            {
                return Ok(result);
            }

            return NotFound();
        }

        /// <summary>
        /// Gets the party id for a given social security number or organization number.
        /// </summary>
        /// <param name="lookupValue">SSN or OrgNumber.</param>
        /// <returns>The party id for the party represeting the provided SNN/OrgNumber.</returns>
        [HttpGet("lookup")]
        public async Task<ActionResult> LookupPartyIdBySSNOrOrgNo([FromBody]string lookupValue)
        {
            int result = await _partiesWrapper.LookupPartyIdBySSNOrOrgNo(lookupValue);
            if (result != -1)
            {
                return Ok(result);
            }

            return NotFound();
        }
    }
}
