using System.Collections.Generic;
using System.Text.Json;
using System.Web;

using Altinn.App.Api.Models;
using Altinn.App.Common.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

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
        private readonly AppSettings _appSettings;
        private readonly IAppResources _appResources;
        private readonly List<string> _onEntryWithInstance = new List<string> { "new-instance", "select-instance" };

        /// <summary>
        /// Initialize a new instance of the <see cref="HomeController"/> class.
        /// </summary>
        /// <param name="antiforgery">The anti forgery service.</param>
        /// <param name="platformSettings">The platform settings.</param>
        /// <param name="env">The current environment.</param>
        /// <param name="appSettings">The application settings</param>
        /// <param name="appResources">The application resources service</param>
        public HomeController(
          IAntiforgery antiforgery,
          IOptions<PlatformSettings> platformSettings,
          IWebHostEnvironment env,
          IOptions<AppSettings> appSettings,
          IAppResources appResources)
        {
            _antiforgery = antiforgery;
            _platformSettings = platformSettings.Value;
            _env = env;
            _appSettings = appSettings.Value;
            _appResources = appResources;
        }

        /// <summary>
        /// Returns the index view with references to the React app.
        /// </summary>
        /// <param name="org">The application owner short name.</param>
        /// <param name="app">The name of the app</param>
        /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
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
            
            if (ShouldShowAppView())
            {
                ViewBag.org = org;
                ViewBag.app = app;
                return PartialView("Index");
            }

            string scheme = _env.IsDevelopment() ? "http" : "https";
            string goToUrl = HttpUtility.UrlEncode($"{scheme}://{Request.Host}/{org}/{app}");

            string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";

            if (!string.IsNullOrEmpty(_appSettings.AppOidcProvider))
            {
                redirectUrl += "&iss=" + _appSettings.AppOidcProvider;
            }

            if (dontChooseReportee)
            {
                redirectUrl += "&DontChooseReportee=true";
            }

            return Redirect(redirectUrl);
        }

        private bool ShouldShowAppView()
        {
            if (User.Identity.IsAuthenticated)
            {
                return true;
            }

            Application application = _appResources.GetApplication();
            bool stateless = !_onEntryWithInstance.Contains(application.OnEntry?.Show);
            if (!stateless) 
            {
                return false;
            }

            DataType dataType = GetStatelessDataType(application);

            if (dataType != null && dataType.AppLogic.AllowAnonymousOnStateless)
            {
                return true;
            }

            return false;
        }

        private DataType GetStatelessDataType(Application application)
        {
            string layoutSetsString = _appResources.GetLayoutSets();
            JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            // Stateless apps only work with layousets
            if (!string.IsNullOrEmpty(layoutSetsString))
            {
                LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, options);
                string dataTypeId = layoutSets.Sets.Find(set => set.Id == application.OnEntry?.Show).DataType;
                return application.DataTypes.Find(d => d.Id == dataTypeId);
            }

            return null;
        }
    }
}
