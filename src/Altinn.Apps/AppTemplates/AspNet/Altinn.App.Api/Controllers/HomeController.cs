using System;
using System.Web;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Altinn.App.Services.Configuration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Api.Controllers
{
    public class HomeController : Controller
    {
        private readonly IAntiforgery _antiforgery;
        private readonly PlatformSettings _platformSettings;
        private readonly IWebHostEnvironment _env;

        public HomeController(
          IAntiforgery antiforgery,
          IOptions<PlatformSettings> platformSettings,
          IWebHostEnvironment env
        )
        {
            _antiforgery = antiforgery;
            _platformSettings = platformSettings.Value;
            _env = env;
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
                string scheme = _env.IsDevelopment() ? "http" : "https";
                string goToUrl = HttpUtility.UrlEncode($"{scheme}://{Request.Host.ToString()}/{org}/{app}");
                string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";
                return Redirect(redirectUrl);
            }
        }
    }
}
