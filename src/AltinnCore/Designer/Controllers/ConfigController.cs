using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller exposing
    /// </summary>
    [Authorize]
    public class ConfigController : Controller
    {
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfigController"/> class
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service</param>
        /// <param name="serviceRepositoryService">The serviceRepository service</param>
        /// <param name="repositorySettings">The repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        public ConfigController(IHostingEnvironment hostingEnvironment, IRepository serviceRepositoryService, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = serviceRepositoryService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// View for basic service configuration
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The View for JSON editor</returns>
        public IActionResult Index(string org, string service)
        {
            return View();
        }

        /// <summary>
        /// The View for configuration of security for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The view with JSON editor</returns>
        public IActionResult Security(string org, string service)
        {
            return View();
        }

        /// <summary>
        /// Common method to update the local config
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The name of the config</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        public IActionResult SaveConfig([FromBody]dynamic jsonData, string org, string service, string id)
        {
            _repository.SaveConfiguration(org, service, id + ".json", jsonData.ToString());
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
            string schema = System.IO.File.ReadAllText(_hostingEnvironment.WebRootPath + $"/designer/json/schema/{id}.json");
            return Content(schema, "application/json", System.Text.Encoding.UTF8);
        }

        /// <summary>
        /// Returns the JSON configuration
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The name on config</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        public IActionResult GetConfig(string org, string service, string id)
        {
            string configJson = _repository.GetConfiguration(org, service, id + ".json");
            if (string.IsNullOrWhiteSpace(configJson))
            {
                configJson = "{}";
            }

            JsonResult result = new JsonResult(configJson);

            return result;
        }
        
        /// <summary>
        /// Method to retrieve the service description from the metadata file
        /// </summary>
        /// <param name="org">the owner of the service</param>
        /// <param name="service">the service</param>
        /// <returns>The service configuration</returns>
        [HttpGet]
        public ServiceConfiguration GetServiceConfig(string org, string service)
        {
            string serviceConfigPath = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject = null;

            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
            }

            return serviceConfigurationObject;
        }

        /// <summary>
        /// Method to set the service description in the metadata file
        /// </summary>
        /// <param name="org">the owner of the service</param>
        /// <param name="service">the service</param>
        /// <param name="serviceConfig">the service config</param>
        [HttpPost]
        public void SetServiceConfig(string org, string service, [FromBody] dynamic serviceConfig)
        {
            string serviceConfigPath = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject = null;

            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
                serviceConfigurationObject.ServiceDescription = serviceConfig.serviceDescription.ToString();
                serviceConfigurationObject.ServiceId = serviceConfig.serviceId.ToString();
            }
            else
            {
                new FileInfo(serviceConfigPath).Directory.Create();
                serviceConfigurationObject = new ServiceConfiguration()
                {
                    RepositoryName = service,
                    ServiceDescription = serviceConfig.serviceDescription.ToString(),
                    ServiceId = serviceConfig.serviceId.ToString(),
                };
            }

            if (serviceConfigurationObject != null)
            {
                System.IO.File.WriteAllText(serviceConfigPath, JObject.FromObject(serviceConfigurationObject).ToString(), Encoding.UTF8);
            }
        }
    }
}
