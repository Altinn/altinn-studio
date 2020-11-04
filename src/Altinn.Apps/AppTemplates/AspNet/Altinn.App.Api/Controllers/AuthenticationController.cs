using System.Threading.Tasks;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
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
            string token = await _authentication.RefreshToken();

            CookieOptions runtimeCookieSetting = new CookieOptions
            {
                Domain = _settings.HostName,
                HttpOnly = true,
                Secure = true,
                IsEssential = true,
                SameSite = SameSiteMode.Lax
            };

            if (!string.IsNullOrWhiteSpace(token))
            {
                HttpContext.Response.Cookies.Append(General.RuntimeCookieName, token, runtimeCookieSetting);
                return Ok();
            }

            return BadRequest();
        }

        /// <summary>
        /// Invalidates the AltinnStudioRuntime cookie.
        /// </summary>
        /// <returns>Ok result with invalidated cookie.</returns>
        [Authorize]
        [HttpPut("{org}/{app}/api/[controller]/invalidatecookie")]
        public IActionResult InvalidateCookie()
        {
            HttpContext.Response.Cookies.Delete(General.RuntimeCookieName, new CookieOptions { Domain = _settings.HostName });
            return Ok();
        }
    }
}
