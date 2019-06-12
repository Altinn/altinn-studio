using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary;
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
        /// <returns>The information about a given person</returns>
        [HttpGet]
        public async Task<ActionResult> Get()
        {
            using (var reader = new StreamReader(Request.Body))
            {
                string ssn = await reader.ReadToEndAsync();
                Person result = await _personsWrapper.GetPerson(ssn);
                if (result == null)
                {
                    return NotFound();
                }

                return Ok(result);
            }
        }     
    }
}
