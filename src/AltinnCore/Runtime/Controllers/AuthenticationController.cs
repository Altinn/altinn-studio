using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<AuthenticationController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationController"/> class
        /// </summary>
        public AuthenticationController(IAuthentication authentication, IOptions<GeneralSettings> settings, ILogger<AuthenticationController> logger)
        {
            _authentication = authentication;
            _settings = settings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Refreshes the AltinnStudioRuntime JwtToken when not in AltinnStudio mode.
        /// </summary>
        /// <returns>Ok result with updated token.</returns>
        [Authorize]
        [HttpGet("{org}/{app}/api/[controller]/keepAlive")]
        public async Task<IActionResult> KeepAlive()
        {
            if (_settings.RuntimeMode != "AltinnStudio")
            {
                string token = await _authentication.RefreshToken();

                CookieOptions runtimeCookieSetting = new CookieOptions
                {
                    Domain = _settings.HostName,
                };

                if (!string.IsNullOrWhiteSpace(token))
                {
                    HttpContext.Response.Cookies.Append(Common.Constants.General.RuntimeCookieName, token, runtimeCookieSetting);
                    return Ok();
                }
                else
                {
                    return BadRequest();
                }
            }

            return Ok();
        }
    }
}
