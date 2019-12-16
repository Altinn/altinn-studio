using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using LocalTest.Services.Register.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The persons controller
    /// </summary>
    [Route("register/api/v1/[controller]")]
    public class PersonsController : Controller
    {
        private readonly IPersons _personsWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsController"/> class
        /// </summary>
        /// <param name="personsWrapper">The persons wrapper</param>
        public PersonsController(IPersons personsWrapper)
        {
            _personsWrapper = personsWrapper;
        }

        /// <summary>
        /// Gets the person for a given ssn
        /// </summary>
        /// <param name="ssn">The ssn</param>
        /// <returns>The information about a given person</returns>
        [HttpGet]
        public async Task<ActionResult> Get([FromBody] string ssn)
        {     
                Person result = await _personsWrapper.GetPerson(ssn);
                if (result == null)
                {
                    return NotFound();
                }

                return Ok(result);
        }     
    }
}
