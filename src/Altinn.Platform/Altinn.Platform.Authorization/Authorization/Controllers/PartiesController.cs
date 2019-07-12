using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to the party
    /// </summary>
    [Route("authorization/api/v1/parties")]
    [ApiController]
    public class PartiesController : ControllerBase
    {
        private readonly IParties _partiesWrapper;        

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class
        /// </summary>
        public PartiesController(IParties partiesWrapper)
        {
            _partiesWrapper = partiesWrapper;
        }

        /// <summary>
        /// Gets the list of actors that the logged in user can represent
        /// </summary>
        /// <param name="userId">the user id</param>
        [HttpGet]
        public async Task<ActionResult> Get(int userId)
        {
            List<Party> partyList = null;

            if (userId != 0)
            {
                partyList = await _partiesWrapper.GetParties(userId);
            }

            if (partyList == null || partyList.Count == 0)
            {
                return NotFound();
            }
            else
            {
                return Ok(partyList);
            }            
        }

        /// <summary>
        /// Dummy api for testing
        /// </summary>
        [HttpGet("test")]
        public ActionResult GetValues()
        {
            List<Party> actorList = new List<Party>();

            Party testActor = new Party()
            {
                SSN = "123456",
                Person = new Person()
                {
                    Name = "test",
                },
                PartyID = 54321
            };

            actorList.Add(testActor);

            return Ok(actorList);
        }
    }
}
