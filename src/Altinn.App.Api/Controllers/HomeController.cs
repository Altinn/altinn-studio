#nullable enable
using System.Text.Json;
using System.Web;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IAppMetadata _appMetadata;
        private readonly List<string> _onEntryWithInstance = new List<string> { "new-instance", "select-instance" };

        /// <summary>
        /// Initialize a new instance of the <see cref="HomeController"/> class.
        /// </summary>
        /// <param name="antiforgery">The anti forgery service.</param>
        /// <param name="platformSettings">The platform settings.</param>
        /// <param name="env">The current environment.</param>
        /// <param name="appSettings">The application settings</param>
        /// <param name="appResources">The application resources service</param>
        /// <param name="appMetadata">The application metadata service</param>
        public HomeController(
            IAntiforgery antiforgery,
            IOptions<PlatformSettings> platformSettings,
            IWebHostEnvironment env,
            IOptions<AppSettings> appSettings,
            IAppResources appResources,
            IAppMetadata appMetadata)
        {
            _antiforgery = antiforgery;
            _platformSettings = platformSettings.Value;
            _env = env;
            _appSettings = appSettings.Value;
            _appResources = appResources;
            _appMetadata = appMetadata;
        }

        /// <summary>
        /// Returns the index view with references to the React app.
        /// </summary>
        /// <param name="org">The application owner short name.</param>
        /// <param name="app">The name of the app</param>
        /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
        [HttpGet]
        [Route("{org}/{app}/")]
        public async Task<IActionResult> Index(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromQuery] bool dontChooseReportee)
        {
            // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            if (tokens.RequestToken != null)
            {
                HttpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken, new CookieOptions
                {
                    HttpOnly = false // Make this cookie readable by Javascript.
                });
            }

            if (await ShouldShowAppView())
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

        private async Task<bool> ShouldShowAppView()
        {
            if (User?.Identity?.IsAuthenticated == true)
            {
                return true;
            }

            Application application = await _appMetadata.GetApplicationMetadata();
            if (!IsStatelessApp(application))
            {
                return false;
            }

            DataType? dataType = GetStatelessDataType(application);

            if (dataType != null && dataType.AppLogic.AllowAnonymousOnStateless)
            {
                return true;
            }

            return false;
        }

        private bool IsStatelessApp(Application application)
        {
            if (application?.OnEntry == null)
            {
                return false;
            }

            return !_onEntryWithInstance.Contains(application.OnEntry.Show);
        }

        private DataType? GetStatelessDataType(Application application)
        {
            string layoutSetsString = _appResources.GetLayoutSets();
            JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            // Stateless apps only work with layousets
            if (!string.IsNullOrEmpty(layoutSetsString))
            {
                LayoutSets? layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, options);
                string? dataTypeId = layoutSets?.Sets?.Find(set => set.Id == application.OnEntry?.Show)?.DataType;
                return application.DataTypes.Find(d => d.Id == dataTypeId);
            }

            return null;
        }
    }
}
