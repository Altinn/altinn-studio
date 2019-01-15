using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

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

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfigController"/> class
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service</param>
        /// <param name="serviceRepositoryService">The serviceRepository service</param>
        public ConfigController(IHostingEnvironment hostingEnvironment, IRepository serviceRepositoryService)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = serviceRepositoryService;
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
    }
}
