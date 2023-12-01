using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller that exposes endpoints for handling everything related to the user's session in Altinn Studio.
    /// </summary>
    [ApiController]
    [Route("/designer/api/session")]
    [AutoValidateAntiforgeryToken]
    public class SessionController : ControllerBase
    {
        private readonly GeneralSettings _settings;
        private readonly int _sessionExtensionInMinutes = 30;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="SessionController"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The context accessor.</param>
        /// <param name="settings">The general settings.</param>
        public SessionController(IHttpContextAccessor httpContextAccessor, GeneralSettings settings)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings;
        }

        /// <summary>
        /// Gets the value of the session timeout cookie.
        /// </summary>
        /// <returns>The remainder of the session in minutes</returns>
        [HttpGet]
        [Route("remaining")]
        public int GetRemainingSessionTime()
        {
            var remainingTime = AuthenticationHelper.GetRemainingSessionTime(_httpContextAccessor.HttpContext, _settings.SessionTimeoutCookieName);

            return remainingTime == TimeSpan.Zero ? -1 : (int)Math.Floor(remainingTime.TotalMinutes);
        }

        /// <summary>
        /// Extends the duration current session
        /// </summary>
        /// <returns>200 ok if session is extended.</returns>
        [HttpGet]
        [Route("keepalive")]
        [Authorize]
        public async Task<ActionResult> KeepAlive()
        {
            HttpContext ctx = _httpContextAccessor.HttpContext;
            ctx.Request.Cookies.TryGetValue(_settings.SessionTimeoutCookieName, out string remainingString);

            if (!DateTime.TryParse(remainingString, out DateTime timeout))
            {
                return Unauthorized();
            }

            if (DateTime.UtcNow >= timeout.AddMinutes(-2))
            {
                return Unauthorized();
            }

            HttpContext.Response.Cookies.Append(_settings.SessionTimeoutCookieName, DateTime.UtcNow.AddMinutes(_sessionExtensionInMinutes - 5).ToString());

            await HttpContext.SignInAsync(
              CookieAuthenticationDefaults.AuthenticationScheme,
              HttpContext.User,
              new AuthenticationProperties
              {
                  ExpiresUtc = DateTime.UtcNow.AddMinutes(_sessionExtensionInMinutes),
                  IsPersistent = false,
                  AllowRefresh = false,
              });

            return Ok(_sessionExtensionInMinutes);
        }

        /// <summary>
        /// Gets session details for debug purposes
        /// </summary>
        /// <returns>Dictionary containing session details</returns>
        [HttpGet]
        [Route("details")]
        [Authorize]
        public ActionResult GetSessionDetails()
        {
            HttpContext ctx = _httpContextAccessor.HttpContext;

            var sessionDetails = new Dictionary<string, string>
            {
                { "AppToken", AuthenticationHelper.GetDeveloperAppToken(ctx) },
                { "AppTokenId", AuthenticationHelper.GetDeveloperAppTokenId(ctx) },
                { "Username", AuthenticationHelper.GetDeveloperUserName(ctx) },
                { "DesignerSessionTimeout", GetRemainingSessionTime().ToString() }
            };

            return Ok(sessionDetails);
        }
    }
}
