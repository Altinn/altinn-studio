using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller exposing
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class ConfigController : Controller
    {
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfigController"/> class.
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service.</param>
        /// <param name="serviceRepositoryService">The serviceRepository service.</param>
        /// <param name="repositorySettings">The repository settings.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public ConfigController(IWebHostEnvironment hostingEnvironment, IRepository serviceRepositoryService, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<ConfigController> logger)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = serviceRepositoryService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// View for basic app configuration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The View for JSON editor</returns>
        public IActionResult Index(string org, string app)
        {
            return View();
        }

        /// <summary>
        /// The View for configuration of security for an app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The view with JSON editor</returns>
        public IActionResult Security(string org, string app)
        {
            return View();
        }

        /// <summary>
        /// Common method to update the local config
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The name of the config</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        public IActionResult SaveConfig([FromBody]dynamic jsonData, string org, string app, string id)
        {
            _repository.SaveConfiguration(org, app, id + ".json", jsonData.ToString());
            return Json(new
            {
                Success = true,
                Message = "Konfigurasjon lagret",
            });
        }

        /// <summary>
        /// Get the JSON schema
        /// </summary>
        /// <param name="id">The name of schema</param>
        /// <returns>JSON content</returns>
        [HttpGet]
        public IActionResult Schema(string id)
        {
            string schema = System.IO.File.ReadAllText(_hostingEnvironment.WebRootPath + $"/designer/json/schema/{id.AsFileName()}.json");
            return Content(schema, "application/json", System.Text.Encoding.UTF8);
        }

        /// <summary>
        /// Returns the JSON configuration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The name on config</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        public IActionResult GetConfig(string org, string app, string id)
        {
            string configJson = _repository.GetConfiguration(org, app, id + ".json");
            if (string.IsNullOrWhiteSpace(configJson))
            {
                configJson = "{}";
            }

            JsonResult result = new JsonResult(configJson);

            return result;
        }

        /// <summary>
        /// Method to retrieve the app description from the metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service configuration</returns>
        [HttpGet]
        public ServiceConfiguration GetServiceConfig(string org, string app)
        {
            string serviceConfigPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject = null;
            var watch = System.Diagnostics.Stopwatch.StartNew();
            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
            }

            watch.Stop();
            _logger.Log(LogLevel.Information, "Getserviceconfig - {0} ", watch.ElapsedMilliseconds);
            return serviceConfigurationObject;
        }

        /// <summary>
        /// Method to set the app description in the metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceConfig">the service config</param>
        [HttpPost]
        public void SetServiceConfig(string org, string app, [FromBody] dynamic serviceConfig)
        {
            string serviceConfigPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject = null;

            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
                serviceConfigurationObject.ServiceDescription = serviceConfig.serviceDescription.ToString();
                serviceConfigurationObject.ServiceId = serviceConfig.serviceId.ToString();
                serviceConfigurationObject.ServiceName = serviceConfig.serviceName.ToString();
            }
            else
            {
                new FileInfo(serviceConfigPath).Directory.Create();
                serviceConfigurationObject = new ServiceConfiguration()
                {
                    RepositoryName = app,
                    ServiceDescription = serviceConfig.serviceDescription.ToString(),
                    ServiceId = serviceConfig.serviceId.ToString(),
                };
            }

            System.IO.File.WriteAllText(serviceConfigPath, JObject.FromObject(serviceConfigurationObject).ToString(), Encoding.UTF8);
            _repository.UpdateServiceInformationInApplication(org, app, serviceConfigurationObject);
        }
    }
}
