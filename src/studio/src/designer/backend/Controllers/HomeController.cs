using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// The default MVC controller in the application
    /// </summary>
    public class HomeController : Controller
    {
        private readonly IGitea _giteaApi;
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
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="sourceControl">the source control</param>
        public HomeController(
            ILogger<HomeController> logger,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IGitea giteaWrapper,
            ISourceControl sourceControl)
        {
            _logger = logger;
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _giteaApi = giteaWrapper;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// the default page for altinn studio when the user is not logged inn
        /// </summary>
        /// <returns>The start page</returns>
        public async Task<ActionResult> StartPage()
        {
            string userName = await _giteaApi.GetUserNameFromUI();

            if (string.IsNullOrEmpty(userName))
            {
                Response.Cookies.Delete(Altinn.Studio.Designer.Constants.General.DesignerCookieName);
                Response.Cookies.Delete(_settings.GiteaCookieName);
                return View("StartPage");
            }

            return LocalRedirect("/dashboard");
        }

        /// <summary>
        /// The default action presenting a list of available apps when the user is logged in
        /// </summary>
        /// <param name="repositorySearch">the search parameter object</param>
        /// <returns>The front page</returns>
        [Authorize]
        public ActionResult Index(RepositorySearch repositorySearch)
        {
            return View();
        }

        /// <summary>
        /// View for creating new org
        /// </summary>
        /// <returns>The create org page</returns>
        [Authorize]
        public ActionResult CreateOrg()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting the Not Authorized View
        /// </summary>
        /// <returns>The view telling user that user was not authorized</returns>
        public IActionResult NotAuthorized()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting documentation
        /// </summary>
        /// <returns>The Doc view</returns>
        public IActionResult Docs()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting error
        /// </summary>
        /// <returns>The Error view</returns>
        public IActionResult Error()
        {
            return View();
        }

        /// <summary>
        /// Login
        /// </summary>
        /// <returns>The login page</returns>
        public async Task<IActionResult> Login()
        {
            string userName = string.Empty;
            string goToUrl = "/";

            // Verify that user is not logged in already.
            if (!string.IsNullOrEmpty(AuthenticationHelper.GetDeveloperUserName(HttpContext)))
            {
                return LocalRedirect(goToUrl);
            }

            // Temporary catch errors until we figure out how to force this.
            try
            {
                userName = await _giteaApi.GetUserNameFromUI();
                if (string.IsNullOrEmpty(userName))
                {
                    return (Environment.GetEnvironmentVariable("ServiceRepositorySettings__GiteaLoginUrl") != null)
                    ? Redirect(Environment.GetEnvironmentVariable("ServiceRepositorySettings__GiteaLoginUrl"))
                    : Redirect(_settings.GiteaLoginUrl);
                }
            }
            catch (Exception ex)
            {
                return Content(ex.ToString());
            }

            _logger.LogInformation("Updating app key for " + userName);
            KeyValuePair<string, string> accessKeyValuePair = await _giteaApi.GetSessionAppKey() ?? default(KeyValuePair<string, string>);
            List<Claim> claims = new List<Claim>();
            const string Issuer = "https://altinn.no";
            if (!accessKeyValuePair.Equals(default(KeyValuePair<string, string>)))
            {
                string accessToken = accessKeyValuePair.Value;
                string accessId = accessKeyValuePair.Key;
                _logger.LogInformation("Adding key to claims: " + accessId);
                claims.Add(new Claim(AltinnCoreClaimTypes.DeveloperToken, accessToken, ClaimValueTypes.String, Issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.DeveloperTokenId, accessId, ClaimValueTypes.String, Issuer));
            }

            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, Issuer));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            string timeoutString = DateTime.UtcNow.AddMinutes(_generalSettings.SessionDurationInMinutes - 5).ToString();
            HttpContext.Response.Cookies.Append(
                _generalSettings.SessionTimeoutCookieName,
                timeoutString,
                new CookieOptions { HttpOnly = true });

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    ExpiresUtc = DateTime.UtcNow.AddMinutes(_generalSettings.SessionDurationInMinutes),
                    IsPersistent = false,
                    AllowRefresh = false,
                });

            return LocalRedirect(goToUrl);
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
                new CookieOptions
                {
                    HttpOnly = true,
                    Expires = DateTime.Now.AddDays(-10)
                });

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return LocalRedirect("/");
        }

        /// <summary>
        /// Go to app token view
        /// </summary>
        /// <returns>The app token view</returns>
        [Authorize]
        [HttpGet]
        public IActionResult AppToken()
        {
            return View();
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
            _sourceControl.StoreAppTokenForUser(appKey.Key);
            return Redirect("/");
        }

        /// <summary>
        /// Debug info
        /// </summary>
        /// <returns>The debug info you want</returns>
        public async Task<IActionResult> Debug()
        {
            StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.AppendLine("Debug info");
            stringBuilder.AppendLine("App token is: " + _sourceControl.GetAppToken());
            stringBuilder.AppendLine("App token id is " + _sourceControl.GetAppTokenId());
            stringBuilder.AppendLine("UserName from service: " + await _giteaApi.GetUserNameFromUI());
            return Content(stringBuilder.ToString());
        }
    }
}
