using AltinnCore.Common.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Controllers
{
    /// <summary>
    ///  Controller for redirecting
    /// </summary>
    public class RedirectController: Controller
    {
        private IHttpContextAccessor _httpContextAccessor;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        ///  Initializes a new instance of the <see cref="RedirectController"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings"> The service repository settings. </param>
        public RedirectController(
            IHttpContextAccessor httpContextAccessor,
            IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = repositorySettings.Value;
        }

        /// <summary>
        /// Method used for setting gitea cookie without path specification and redirecting to Login Home
        /// </summary>
        /// <returns> Redirect to login page with gitea cookie </returns>
        public ActionResult FetchCookieAndRedirectHome()
        {
            string giteaCookieKey = _settings.GiteaCookieName;
            var giteaCookieValue = _httpContextAccessor.HttpContext.Request.Cookies[giteaCookieKey];

            if (giteaCookieValue != null)
            {
                CookieOptions cookieOptions = new CookieOptions
                {
                    HttpOnly = true
                };

                Response.Cookies.Append(giteaCookieKey, giteaCookieValue, cookieOptions);

            }

            return RedirectToAction("Login", "Home");
        }
    }
}
