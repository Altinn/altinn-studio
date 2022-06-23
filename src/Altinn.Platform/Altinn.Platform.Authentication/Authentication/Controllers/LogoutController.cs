using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Extensions;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Controller responsible for loging out
    /// </summary>
    [Route("authentication/api/v1")]
    [ApiController]
    public class LogoutController : ControllerBase
    {
        private const string OriginalIssClaimName = "originaliss";

        private readonly GeneralSettings _generalSettings;
   
        private readonly OidcProviderSettings _oidcProviderSettings;
        private readonly JwtSecurityTokenHandler _validator;

        /// <summary>
        /// Defay
        /// </summary>
        public LogoutController(
            ILogger<LogoutController> logger,
            IOptions<GeneralSettings> generalSettings,
            IOptions<OidcProviderSettings> oidcProviderSettings,
            IOidcProvider oidcProvider)
        {
            _generalSettings = generalSettings.Value;
            _oidcProviderSettings = oidcProviderSettings.Value;
            _validator = new JwtSecurityTokenHandler();
        }

        /// <summary>
        /// Logs out user
        /// </summary>
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status302Found)]
        [HttpGet("logout")]
        public ActionResult Logout()
        {
            string orgIss = null;
            string tokenCookie = Request.Cookies[_generalSettings.JwtCookieName];
            if (_validator.CanReadToken(tokenCookie))
            {
                JwtSecurityToken jwt = _validator.ReadJwtToken(tokenCookie);
                orgIss = jwt.Claims.Where(c => c.Type.Equals(OriginalIssClaimName)).Select(c => c.Value).FirstOrDefault();
            }

            OidcProvider provider = GetOidcProvider(orgIss);
            if (provider == null)
            {
                return Redirect(_generalSettings.SBLLogoutEndpoint);
            }

            CookieOptions opt = new CookieOptions() { Domain = _generalSettings.HostName, Secure = true, HttpOnly = true };
            Response.Cookies.Delete(_generalSettings.SblAuthCookieName, opt);
            Response.Cookies.Delete(_generalSettings.JwtCookieName, opt);

            return Redirect(provider.LogoutEndpoint);
        }

        /// <summary>
        /// Frontchannel logout for OIDC
        /// </summary>
        /// <returns></returns>
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [HttpGet("frontchannel_logout")]
        public ActionResult FrontchannelLogout()
        {
            CookieOptions opt = new CookieOptions() { Domain = _generalSettings.HostName, Secure = true, HttpOnly = true };
            Response.Cookies.Delete(_generalSettings.SblAuthCookieName, opt);
            Response.Cookies.Delete(_generalSettings.JwtCookieName, opt);
            return Ok();
        }

        private OidcProvider GetOidcProvider(string iss)
        {
            if (!string.IsNullOrEmpty(iss) && _oidcProviderSettings.ContainsKey(iss))
            {
                return _oidcProviderSettings[iss];
            }

            return null;
        }
    }
}
