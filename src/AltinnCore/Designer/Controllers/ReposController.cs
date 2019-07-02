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
        /// Index controller
        /// </summary>
        /// <returns>Redirect to login page with gitea cookie set with path = / </returns>
        public ActionResult Index()
        {
            string cookieKey = "i_like_gitea";
            var giteaCookie = _httpContextAccessor.HttpContext.Request.Cookies[cookieKey];
            Response.Cookies.Append(cookieKey, giteaCookie);
            return RedirectToAction("Login", "Home");

        }
    }
}
