using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
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
    /// Controller for resources
    /// </summary>
    [Authorize]
    public class TextController : Controller
    {
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextController"/> class.
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service.</param>
        /// <param name="repositoryService">The app repository service.</param>
        /// <param name="repositorySettings">The repository settings.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public TextController(IHostingEnvironment hostingEnvironment, IRepository repositoryService, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<TextController> logger)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repositoryService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// The View for text resources
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The view with JSON editor</returns>
        public IActionResult Index(string org, string app)
        {
            IList<string> languages = _repository.GetLanguages(org, app);

            if (Request.Headers["accept"] == "application/json")
            {
                Dictionary<string, Dictionary<string, string>> resources = _repository.GetServiceTexts(org, app);
                return Json(resources);
            }

            return View(languages);
        }

        /// <summary>
        /// /// The languages in the app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        public IActionResult GetLanguages(string org, string app)
        {
            List<string> languages = _repository.GetLanguages(org, app);
            return Json(languages);
        }

        /// <summary>
        /// Save a resource file
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code> )</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        public IActionResult SaveResource([FromBody]dynamic jsonData, string id, string org, string app)
        {
            JObject json = jsonData;

            // Sort resource texts by id
            JArray resources = json["resources"] as JArray;
            JArray sorted = new JArray(resources.OrderBy(obj => obj["id"]));
            json["resources"].Replace(sorted);

            // updating application metadata with appTitle.
            JToken appTitleToken = resources.FirstOrDefault(x => x.Value<string>("id") == "ServiceName");
            if (!(appTitleToken == null))
            {
                string appTitle = appTitleToken.Value<string>("value");
                _repository.UpdateAppTitle(org, app, id, appTitle);
            }
    
            _repository.SaveResource(org, app, id, json.ToString());

            return Json(new
            {
                Success = true,
                Message = "Språk lagret",
            });
        }

        /// <summary>
        /// Deletes a language resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>Deletes a language resource</returns>
        [HttpDelete]
        public IActionResult DeleteLanguage(string org, string app, string id)
        {
            bool deleted = _repository.DeleteLanguage(org, app, id);
            return Json(new { Message = "Språket " + id + " er nå slettet!", Id = id, GikkBra = deleted });
        }

        /// <summary>
        /// Get the JSON schema for resource files
        /// </summary>
        /// <returns>JSON content</returns>
        [HttpGet]
        public IActionResult GetResourceSchema()
        {
            string schema = System.IO.File.ReadAllText(_hostingEnvironment.WebRootPath + $"/designer/json/schema/resource-schema.json");
            return Content(schema, "application/json", System.Text.Encoding.UTF8);
        }

        /// <summary>
        /// Returns the a JSON resource file for the given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        public IActionResult GetResource(string org, string app, string id)
        {
            string resourceJson = _repository.GetResource(org, app, id);
            if (string.IsNullOrWhiteSpace(resourceJson))
            {
                resourceJson = string.Empty;
            }

            JsonResult result = new JsonResult(resourceJson);
            return result;
        }

        /// <summary>
        /// Method to retrieve service name from textresources file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service name of the service</returns>
        [HttpGet]
        public string GetServiceName(string org, string app)
        {
            string defaultLang = "nb-NO";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;
            string serviceName = string.Empty;

            var watch = System.Diagnostics.Stopwatch.StartNew();
            if (System.IO.File.Exists(serviceResourceDirectoryPath))
            {
                string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);
                ResourceCollection textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);
                if (textResourceObject != null)
                {
                    serviceName = textResourceObject.Resources.FirstOrDefault(r => r.Id == "ServiceName") != null ? textResourceObject.Resources.FirstOrDefault(r => r.Id == "ServiceName").Value : string.Empty;
                }
            }

            watch.Stop();
            _logger.Log(LogLevel.Information, "Getservicename - {0} ", watch.ElapsedMilliseconds);
            return serviceName;
        }

        /// <summary>
        /// Method to save the updated service name to the textresources file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceName">The service name</param>
        [HttpPost]
        public void SetServiceName(string org, string app, [FromBody] dynamic serviceName)
        {
            string defaultLang = "nb-NO";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;
            if (System.IO.File.Exists(serviceResourceDirectoryPath))
            {
                string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);

                ResourceCollection textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);

                if (textResourceObject != null)
                {
                    textResourceObject.Add("ServiceName", serviceName.serviceName.ToString());
                }

                _repository.SaveResource(org, app, "nb-NO", JObject.FromObject(textResourceObject).ToString());
            }
            else
            {
                JObject json = JObject.FromObject(new
                {
                    language = "nb-NO",
                    resources = new[] { new { id = "ServiceName", value = serviceName.serviceName.ToString() } },
                });
                _repository.SaveResource(org, app, "nb-NO", json.ToString());
            }
        }
    }
}
