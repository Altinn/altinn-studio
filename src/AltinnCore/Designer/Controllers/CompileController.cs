using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Designer.Controllers
{
    /// <summary>
    /// Controller for compile API endpoint
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/v1/[controller]")]
    public class CompileController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly ICompilation _compilation;

        /// <summary>
        /// Initializes a new instance of the CompileController
        /// </summary>
        public CompileController(ILogger<CompileController> logger, ICompilation compilation)
        {
            _logger = logger;
            _compilation = compilation;
        }

        /// <summary>
        /// Compiles the c# service files
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <returns>A compile result</returns>
        [HttpPost]
        public IActionResult Compile(string org, string service)
        {
            return Ok(org + " " + service);
        }

    }
}
