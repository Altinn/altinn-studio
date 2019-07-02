using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Designer.Controllers
{
    /// <summary>
    ///  Some shit
    /// </summary>
    public class ReposController: Controller
    {
        private IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        ///  Repos controller
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        public ReposController(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Index method used for setting i_like_gitea with correct path
        /// </summary>
        /// <returns>Redirect to login page with gitea cookie set with path = / </returns>
        public ActionResult Index()
        {
            string giteaCookieKey = "i_like_gitea";
            var giteaCookieValue = _httpContextAccessor.HttpContext.Request.Cookies[giteaCookieKey];
            Response.Cookies.Append(giteaCookieKey, giteaCookieValue);
            return RedirectToAction("Login", "Home");

        }
    }
}
