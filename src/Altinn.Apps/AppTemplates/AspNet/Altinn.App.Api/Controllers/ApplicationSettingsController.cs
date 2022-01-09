using Altinn.App.Api.Models;
using Altinn.App.Services.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller that exposes application config
    /// </summary>
    [ApiController]
    public class ApplicationSettingsController : ControllerBase
    {
        private readonly AppSettings _appSettings;

        /// <summary>
        /// Controller that exposes a subset of app setings
        /// </summary>
        public ApplicationSettingsController(IOptions<AppSettings> appSettings)
        {
            _appSettings = appSettings.Value;
        }

        /// <summary>
        /// Returns the application settings
        /// </summary>
        [HttpGet("{org}/{app}/api/v1/applicationsettings")]
        public IActionResult GetAction(string org, string app)
        {
            return Ok(GetSettings());
        }

        private SimpleAppSettings GetSettings()
        {
            SimpleAppSettings settings = new SimpleAppSettings();
            settings.AppOidcProvider = _appSettings.AppOidcProvider;
            return settings;
        }
    }
}
