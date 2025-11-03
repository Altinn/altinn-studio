#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to environments.
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class EnvironmentsController : ControllerBase
    {
        private readonly IEnvironmentsService _environmentsService;


        /// <summary>
        /// Initializes a new instance of the <see cref="EnvironmentsController"/> class.
        /// </summary>
        /// <param name="environmentsService">EnvironmentsService</param>
        public EnvironmentsController(IEnvironmentsService environmentsService)
        {
            _environmentsService = environmentsService;
        }

        /// <summary>
        /// Gets list of environments
        /// </summary>
        /// <returns>List of environments</returns>
        [HttpGet]
        [Route("designer/api/environments")]
        public async Task<List<EnvironmentModel>> Environments()
        {
            return await _environmentsService.GetEnvironments();
        }
    }
}
