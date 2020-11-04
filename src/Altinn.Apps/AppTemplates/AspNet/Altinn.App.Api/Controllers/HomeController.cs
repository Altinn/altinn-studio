using System;
using System.Web;

using Altinn.App.Services.Configuration;

using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Provides access to the default home view.
    /// </summary>
    public class HomeController : Controller
    {
        private readonly IAntiforgery _antiforgery;
        private readonly PlatformSettings _platformSettings;
        private readonly IWebHostEnvironment _env;

        /// <summary>
        /// Initialize a new instance of the <see cref="HomeController"/> class.
        /// </summary>
        /// <param name="antiforgery">The anti forgery service.</param>
        /// <param name="platformSettings">The platform settings.</param>
        /// <param name="env">The current environment.</param>
        public HomeController(
          IAntiforgery antiforgery,
          IOptions<PlatformSettings> platformSettings,
          IWebHostEnvironment env)
        {
            _antiforgery = antiforgery;
            _platformSettings = platformSettings.Value;
            _env = env;
        }

        /// <summary>
        /// Returns the index view with references to the React app.
        /// </summary>
        /// <param name="org">The application owner short name.</param>
        /// <param name="app">The name of the app</param>
        /// <param name="instanceId">The id of the instance being handled.</param>
        /// <returns></returns>
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
