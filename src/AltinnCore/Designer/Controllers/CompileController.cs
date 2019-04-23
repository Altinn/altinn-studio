using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Designer.Controllers
{
    /// <summary>
    /// Controller for compile API endpoint
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    public class CompileController : ControllerBase
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the CompileController
        /// </summary>
        public CompileController(ILogger<CompileController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Compiles the c# service files
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <returns>A compile result</returns>
        public IActionResult Compile(string org, string service)
        {
            return Ok(org + " " + service);
        }

    }
}
