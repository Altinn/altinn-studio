using System.Text.Json;

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
        private JsonSerializerOptions _serializerOptions = new JsonSerializerOptions
        {
            DictionaryKeyPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly AppSettings _appSettings;
        private readonly FrontEndSettings _frontEndSettings;

        /// <summary>
        /// Controller that exposes a subset of app setings
        /// </summary>
        public ApplicationSettingsController(IOptions<AppSettings> appSettings, IOptions<FrontEndSettings> frontEndSettings)
        {
            _appSettings = appSettings.Value;
            _frontEndSettings = frontEndSettings.Value;
        }

        /// <summary>
        /// Returns the application settings
        /// </summary>
        [HttpGet("{org}/{app}/api/v1/applicationsettings")]
        public IActionResult GetAction(string org, string app)
        {
            FrontEndSettings frontEndSettings = _frontEndSettings;

            // Adding key from _appSettings to be backwards compatible.
            if (!frontEndSettings.ContainsKey(nameof(_appSettings.AppOidcProvider)) && !string.IsNullOrEmpty(_appSettings.AppOidcProvider))
            {
                frontEndSettings.Add(nameof(_appSettings.AppOidcProvider), _appSettings.AppOidcProvider);
            }

            return new JsonResult(frontEndSettings, _serializerOptions);
        }
    }
}
