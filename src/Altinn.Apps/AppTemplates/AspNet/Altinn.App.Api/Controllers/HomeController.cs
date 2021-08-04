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
        /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
        /// <param name="o">Parameter indicating who the user should represent</param>
        /// <returns></returns>
        [HttpGet]
        [Route("{org}/{app}/")]
        public IActionResult Index(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] bool dontChooseReportee)
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

            string scheme = _env.IsDevelopment() ? "http" : "https";
            string goToUrl = HttpUtility.UrlEncode($"{scheme}://{Request.Host}/{org}/{app}");

            string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";

            if (dontChooseReportee)
            {
                redirectUrl += "&DontChooseReportee=true";
            }

            return Redirect(redirectUrl);
        }
    }
}
