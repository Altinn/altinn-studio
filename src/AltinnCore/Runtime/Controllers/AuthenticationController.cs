using System.Net;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Exposes API endpoints related to authentication.
    /// </summary>
    public class AuthenticationController : ControllerBase
    {
        private readonly IAuthentication _authentication;
        private readonly GeneralSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationController"/> class
        /// </summary>
        public AuthenticationController(IAuthentication authentication, IOptions<GeneralSettings> settings)
        {
            _authentication = authentication;
            _settings = settings.Value;
        }

        /// <summary>
        /// Refreshes the AltinnStudioRuntime JwtToken when not in AltinnStudio mode.
        /// </summary>
        /// <returns>Ok result with updated token.</returns>
        [HttpGet("{org}/{service}/api/{controller}/keepAlive")]
        public async Task<IActionResult> KeepAlive()
        {
            if (_settings.RuntimeMode != "AltinnStudio")
            {
                HttpStatusCode result = await _authentication.RefreshToken();
                return result == HttpStatusCode.OK ? Ok() : StatusCode((int)result);
            }

            return Ok();
        }
    }
}
