#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// The default MVC controller in the application
    /// </summary>
    [Route("[action]/{id?}")]
    [Route("[controller]/[action]/{id?}")]
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly ServiceRepositorySettings _settings;
        private readonly ISourceControl _sourceControl;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="HomeController"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="repositorySettings">settings for the repository</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="sourceControl">the source control</param>
        public HomeController(
            ILogger<HomeController> logger,
            ServiceRepositorySettings repositorySettings,
            GeneralSettings generalSettings,
            ISourceControl sourceControl
        )
        {
            _logger = logger;
            _settings = repositorySettings;
            _generalSettings = generalSettings;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// the default page for altinn studio when the user is not logged in
        /// </summary>
        /// <returns>The start page</returns>
        [Route("/")]
        [Route("/[controller]")]
        [Route("/[controller]/[action]/{id?}", Name = "DefaultNotLoggedIn")]
        public async Task<ActionResult> StartPage()
        {
            await Task.CompletedTask;
            bool isUserLoggedIn = User.Identity?.IsAuthenticated ?? false;

            if (isUserLoggedIn)
            {
                return LocalRedirect("/dashboard");
            }

            Response.Cookies.Delete(General.DesignerCookieName);
            Response.Cookies.Delete(_settings.GiteaCookieName);
            return View("StartPage");
        }

        /// <summary>
        /// Login
        /// </summary>
        /// <returns>The login page</returns>
        [Authorize]
        public async Task<IActionResult> Login()
        {
            await Task.CompletedTask;
            return LocalRedirect("/");
        }

        /// <summary>
        /// Logout
        /// </summary>
        /// <returns>The logout page</returns>
        public async Task<IActionResult> Logout()
        {
            HttpContext.Response.Cookies.Append(
                _generalSettings.SessionTimeoutCookieName,
                string.Empty,
                new CookieOptions { HttpOnly = true, Expires = DateTime.Now.AddDays(-10) }
            );

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return LocalRedirect("/");
        }

        /// <summary>
        /// Store app token for user
        /// </summary>
        /// <param name="appKey">the app key</param>
        /// <returns>redirects user</returns>
        [Authorize]
        [HttpPost]
        public IActionResult AppToken(AppKey appKey)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            _sourceControl.StoreAppTokenForUser(appKey.Key, developer);
            return Redirect("/");
        }
    }
}
