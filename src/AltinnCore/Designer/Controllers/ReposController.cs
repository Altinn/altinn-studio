using AltinnCore.Common.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Controllers
{
    /// <summary>
    ///  Controller for generating repository cookie
    /// </summary>
    public class ReposController: Controller
    {
        private IHttpContextAccessor _httpContextAccessor;
        private readonly ServiceRepositorySettings _settings;
        private readonly ILogger _logger;

        /// <summary>
        ///  Initializes a new instance of the <see cref="ReposController"/> class. 
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings"> The service repository settings. </param>
        /// <param name="logger">The logger</param>
        public ReposController(
            IHttpContextAccessor httpContextAccessor,
            IOptions<ServiceRepositorySettings> repositorySettings,
            ILogger<ReposController> logger)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = repositorySettings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Index method used for setting gitea cookie without path specification
        /// </summary>
        /// <returns> Redirect to login page with gitea cookie </returns>
        public ActionResult Index()
        {            
            string giteaCookieKey = _settings.GiteaCookieName;          
            var giteaCookieValue = _httpContextAccessor.HttpContext.Request.Cookies[giteaCookieKey];
            Response.Cookies.Append(giteaCookieKey, giteaCookieValue);
            _logger.LogInformation($" ReposController / Setting cookies: {giteaCookieKey} : {giteaCookieValue}");
            return RedirectToAction("Login", "Home");

        }
    }
}
