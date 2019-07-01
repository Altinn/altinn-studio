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
        ///  Some shit
        /// </summary>
        /// <param name="httpContextAccessor">Param</param>
        public ReposController(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Some shit
        /// </summary>
        /// <returns>Something</returns>
        public ActionResult Index()
        {
            string cookieKey = "i_like_gitea";
            var giteaCookie = _httpContextAccessor.HttpContext.Request.Cookies[cookieKey];
            Set(cookieKey, giteaCookie);
            return RedirectToAction("Login", "Home");

        }

        /// <summary>
        /// set the cookie
        /// </summary>
        /// <param name="key">key (unique indentifier)</param>
        /// <param name="value">value to store in cookie object</param>
        private void Set(string key, string value)
        {
            CookieOptions option = new CookieOptions();
            Response.Cookies.Append(key, value, option);
        }
    }
}
