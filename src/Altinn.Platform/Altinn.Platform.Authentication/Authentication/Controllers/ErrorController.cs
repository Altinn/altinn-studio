using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Handles the presentation of unhandled exceptions during the execution of a requeest.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [Route("authentication/api/v1")]
    public class ErrorController : ControllerBase
    {
        /// <summary>
        /// Create a response with a new <see cref="ProblemDetails"/> instance with limited information.
        /// </summary>
        /// <returns>A new <see cref="ObjectResult"/> instance.</returns>
        [HttpGet("error")]
        public IActionResult Error() => Problem();
    }
}
