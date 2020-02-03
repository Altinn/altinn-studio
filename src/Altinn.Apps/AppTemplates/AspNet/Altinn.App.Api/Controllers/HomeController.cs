using System;
using System.Web;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Altinn.App.Services.Configuration;

namespace Altinn.App.Api.Controllers
{
    public class HomeController : Controller
    {
        private readonly IAntiforgery _antiforgery;
        private readonly PlatformSettings _platformSettings;

        public HomeController(
          IAntiforgery antiforgery,
          IOptions<PlatformSettings> platformSettings
        )
        {
            _antiforgery = antiforgery;
            _platformSettings = platformSettings.Value;
        }

        [Route("{org}/{app}/")]
        [Route("{org}/{app}/{instanceId}")]
        public IActionResult Index([FromRoute] string org, [FromRoute] string app, [FromRoute] Guid? instanceId)
        {
            // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            HttpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken, new CookieOptions
            {
                HttpOnly = false // Make this cookie readable by Javascript.
            });

            if (User.Identity.IsAuthenticated)
            {
                ViewBag.org = org;
                ViewBag.app = app;
                return PartialView("Index");
            }
            else
            {
                string goToUrl = HttpUtility.UrlEncode($"{Request.Host.ToUriComponent()}/{org}/{app}");
                string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";
                return Redirect(redirectUrl);
            }
        }
    }
}
