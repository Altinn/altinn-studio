using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Runtime.Controllers
{    
    /// <summary>
    /// To handle authentication related operations
    /// </summary>
    public class AccountController : Controller
    {
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AccountController"/> class
        /// </summary>
        /// <param name="platformSettings">the configuration for platform</param>
        public AccountController(IOptions<PlatformSettings> platformSettings)
        {
            _platformSettings = platformSettings.Value;
        }

        /// <summary>
        /// Redirects to login
        /// </summary>
        /// <returns></returns>
        public IActionResult Login(string goToUrl)
        {
            //return Redirect("http://platform.at21.altinn.cloud/authentication/api/v1/authentication?goto=https://tdd.apps.at21.altinn.cloud/tdd/testxmlfail");
            return Redirect($"{_platformSettings.GetApiAuthenticationEndpoint}authentication?goto={goToUrl}");
        }
    }
}
