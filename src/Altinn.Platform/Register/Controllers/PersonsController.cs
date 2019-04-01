using System.Threading.Tasks;
using Altinn.Platform.Register.Model;
using Altinn.Platform.Register.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Controllers
{
    /// <summary>
    /// The persons controller
    /// </summary>
    [Route("api/v1/[controller]")]
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
        [HttpGet("{ssn}")]
        public Task<Person> Get(string ssn)
        {
            return _personsWrapper.GetPerson(ssn);
        }
    }
}
