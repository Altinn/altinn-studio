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

        [HttpGet("orgToken")]
        public ActionResult GenerateOrgToken(
            [FromQuery] string org = "ttd",
            [FromQuery] int orgNumber = 111111111,
            [FromQuery] string scope = "altinn:instances.read altinn:instances.write")
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim("urn:altinn:org", org, ClaimValueTypes.String),
                new Claim("urn:altinn:orgNumber", orgNumber.ToString(), ClaimValueTypes.Integer32),
                new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "fake-local-maskinporten", ClaimValueTypes.String),
                new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32),
                new Claim("urn:altinn:scope", scope, ClaimValueTypes.String)
            };

            ClaimsIdentity identity = new ClaimsIdentity("OrganisationLogin");

            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));

            return Ok(token);
        }

        [HttpGet("appToken")]
        public ActionResult GenerateAppToken(
            [FromQuery] int authenticationLevel = 3,
            [FromQuery] int userId = 500000)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "fake-local-test", ClaimValueTypes.String),
                new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authenticationLevel.ToString(), ClaimValueTypes.Integer32),
                new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.Integer32)
            };

            ClaimsIdentity identity = new ClaimsIdentity("PersonLogin");

            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));

            return Ok(token);
        }
    }
}
