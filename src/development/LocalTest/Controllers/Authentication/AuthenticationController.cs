using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using LocalTest.Configuration;
using LocalTest.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LocalTest.Controllers.Authentication
{
    [Route("authentication/api/v1/")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private readonly JwtCookieHandler jwtHandler;
        private readonly ILogger<AuthenticationController> logger;
        private readonly GeneralSettings generalSettings;

        public AuthenticationController(
            ILogger<AuthenticationController> logger,
            IOptions<GeneralSettings> generalSettings,
            JwtCookieHandler jwtHandler)
        {
            this.logger = logger;
            this.generalSettings = generalSettings.Value;
            this.jwtHandler = jwtHandler;
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [HttpGet("refresh")]
        public ActionResult RefreshJWTCookie()
        {
            logger.LogInformation($"Starting to refresh token...");
            ClaimsPrincipal principal = HttpContext.User;
            logger.LogInformation("Refreshing token....");

            string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));
            logger.LogInformation($"End of refreshing token");
            return Ok(token);
        }
    }
}
