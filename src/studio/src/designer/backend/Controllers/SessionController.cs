using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller that exposes endpoints for hangling everything related to the user's session in Altinn Studio.
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/session")]
    [AutoValidateAntiforgeryToken]
    public class SessionController : ControllerBase
    {
        private readonly GeneralSettings _settings;
        private readonly int _sessingExtensionInMinutes = 30;

        /// <summary>
        /// Initializes a new instance of the <see cref="SessionController"/> class.
        /// </summary>
        /// <param name="settings">The general settings.</param>
        public SessionController(IOptions<GeneralSettings> settings)
        {
            _settings = settings.Value;
        }

        /// <summary>
        /// Gets the value of the session timeout cookie.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Route("remaining")]

        public int GetRemainingSessionTime()
        {
            HttpContext.Request.Cookies.TryGetValue(_settings.SessionTimeoutCookieName, out string remainingString);

            if (string.IsNullOrEmpty(remainingString) || !DateTime.TryParse(remainingString, out DateTime timeout))
            {
                return -1;
            }

            return (int)Math.Floor((timeout - DateTime.UtcNow).TotalMinutes);
        }

        /// <summary>
        /// Extends the current session with the defined extension length.
        /// </summary>
        /// <returns></returns>
        [HttpPut]
        [Route("keepAlive")]
        public async Task<ActionResult> KeepAlive()
        {
            AuthenticateResult ar = await HttpContext.AuthenticateAsync();

            if (!ar.Succeeded)
            {
                return Unauthorized();
            }

            HttpContext.Request.Cookies.TryGetValue(_settings.SessionTimeoutCookieName, out string remainingString);

            if (!DateTime.TryParse(remainingString, out DateTime timeout))
            {
                return Unauthorized();
            }

            if (DateTime.UtcNow < timeout.AddMinutes(-2))
            {
                HttpContext.Response.Cookies.Append(_settings.SessionTimeoutCookieName, DateTime.UtcNow.AddMinutes(_sessingExtensionInMinutes - 5).ToString());

                await HttpContext.SignInAsync(
                  CookieAuthenticationDefaults.AuthenticationScheme,
                  HttpContext.User,
                  new AuthenticationProperties
                  {
                      ExpiresUtc = DateTime.UtcNow.AddMinutes(_sessingExtensionInMinutes),
                      IsPersistent = false,
                      AllowRefresh = false,
                  });

                return Ok();
            }

            return Unauthorized();            
        }
    }
}
