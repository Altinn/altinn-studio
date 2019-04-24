using System;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
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
    [Route("designer/api/v1/[controller]")]
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
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <returns>A compile result</returns>
        [HttpPost]
        public async Task<IActionResult> Compile(string org, string app)
        {
            if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(app))
            {
                return BadRequest("Org or service not supplied");
            }

            try
            {
                ServiceIdentifier serviceIdentifier = new ServiceIdentifier { Org = org, Service = app };
                CodeCompilationResult compileResult = await CompileHelper.CompileService(_compilation, serviceIdentifier);
                return Ok(compileResult);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Compiling services files for org: {org}, app: {app} failed with message: {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }
    }
}
