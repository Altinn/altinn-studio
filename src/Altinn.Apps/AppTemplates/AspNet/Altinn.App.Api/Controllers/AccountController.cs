using Altinn.App.Services.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
{    
    /// <summary>
    /// To handle authentication related operations
    /// </summary>
    public class AccountController : Controller
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AccountController"/> class
        /// </summary>
        /// <param name="platformSettings">the configuration for platform</param>
        /// <param name="logger">the logger</param>
        public AccountController(IOptions<PlatformSettings> platformSettings, ILogger<AccountController> logger)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Redirects to login
        /// </summary>
        /// <returns></returns>
        public IActionResult Login(string goToUrl)
        {
            _logger.LogInformation($"Account login - gotourl - {goToUrl}");
            return Redirect($"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}");
        }
    }
}
