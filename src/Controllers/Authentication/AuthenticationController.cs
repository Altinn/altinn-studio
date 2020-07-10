using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

using AltinnCore.Authentication.Constants;
using LocalTest.Configuration;
using LocalTest.Services.Authentication.Interface;

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
        private readonly ILogger<AuthenticationController> _logger;
        private readonly GeneralSettings _generalSettings;
        private readonly IAuthentication _authenticationService;

        public AuthenticationController(
            ILogger<AuthenticationController> logger,
            IOptions<GeneralSettings> generalSettings,
            IAuthentication authenticationService)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _authenticationService = authenticationService;
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [HttpGet("refresh")]
        public async Task<ActionResult> RefreshJWTCookie()
        {
            _logger.LogInformation("Starting to refresh token...");
            ClaimsPrincipal principal = HttpContext.User;
            _logger.LogInformation("Refreshing token....");

            string token = _authenticationService.GenerateToken(principal, Convert.ToInt32(_generalSettings.JwtCookieValidityTime));
            _logger.LogInformation("End of refreshing token");
            return await Task.FromResult(Ok(token));
        }

        [HttpGet("orgToken")]
        public async Task<ActionResult> GenerateOrgToken(
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

            string token = _authenticationService.GenerateToken(principal, Convert.ToInt32(_generalSettings.JwtCookieValidityTime));
            
            return await Task.FromResult(Ok(token));
        }

        [HttpGet("appToken")]
        public async Task<ActionResult> GenerateAppToken(
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

            string token = _authenticationService.GenerateToken(principal, Convert.ToInt32(_generalSettings.JwtCookieValidityTime));
            
            return await Task.FromResult(Ok(token));
        }
    }
}
