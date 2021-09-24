using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
#nullable enable

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for resources
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class TextController : Controller
    {
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly JsonSerializerSettings _serializerSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextController"/> class.
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service.</param>
        /// <param name="repositoryService">The app repository service.</param>
        /// <param name="repositorySettings">The repository settings.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public TextController(IWebHostEnvironment hostingEnvironment, IRepository repositoryService, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<TextController> logger)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repositoryService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _serializerSettings = new JsonSerializerSettings
            {
                Formatting = Formatting.Indented,
                NullValueHandling = NullValueHandling.Ignore
            };
        }

        /// <summary>
        /// The View for text resources
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The view with JSON editor</returns>
        [Obsolete]
        public IActionResult Index(string org, string app)
        {
            IList<string> languages = _repository.GetLanguages(org, app);

            if (Request.Headers["accept"] == "application/json")
            {
                Dictionary<string, Dictionary<string, TextResourceElement>> resources = _repository.GetServiceTexts(org, app);
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
        [Obsolete]
        public IActionResult GetLanguages(string org, string app)
        {
            List<string> languages = _repository.GetLanguages(org, app);
            return Json(languages);
        }

        /// <summary>
        /// Data type for SaveResourcesRequest
        /// mirrored in frontend/packages/text-editor/src/api.ts
        /// </summary>
        public class SaveResourcesRequest
        {
            /// <summary>
            /// Dictionary of the structure Edited[ResourceID][LanguageCode] == ResourceTextInLanguage
            ///                         and Edited[ResourceID]["id"] == ResourceID
            /// </summary>
            public Dictionary<string, Dictionary<string, string>>? Edited { get; set; }

            /// <summary>
            /// List of ids that is deleleted by this request
            /// </summary>
            public List<string>? DeletedIds { get; set; }
        }

        /// <summary>
        /// Save text resources
        /// </summary>
        /// <param name="requestData">The JSON Data</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Http 200 for success or 500 for failiure</returns>
        [HttpPost]
        public IActionResult SaveResources([FromBody] SaveResourcesRequest requestData, string org, string app)
        {
            if (
                requestData == null ||
                requestData.DeletedIds == null ||
                requestData.Edited == null)
            {
                return BadRequest();
            }

            var languagesInUpdate = new HashSet<string>(requestData.Edited.Values.SelectMany(r => r.Keys));
            if (requestData.DeletedIds.Count > 0)
            {
                // update all languages if there are deleted keys
                languagesInUpdate.UnionWith(_repository.GetLanguages(org, app));
            }

            foreach (var language in languagesInUpdate)
            {
                var repoResource = _repository.GetLanguageResource(org, app, language) ?? new TextResource { Language = language, Resources = new List<TextResourceElement>() };

                // Update edits
                foreach ((var key, var edits) in requestData.Edited)
                {
                    if (edits.ContainsKey(language))
                    {
                        var e = repoResource.Resources.FirstOrDefault(r => r.Id == key);
                        if (e == null)
                        {
                            e = new TextResourceElement { Id = key };
                            repoResource.Resources.Add(e);
                        }

                        e.Value = edits[language];
                    }
                }

                // Update deletes
                repoResource.Resources.RemoveAll(r => requestData.DeletedIds.Contains(r.Id));

                // Order resources by ID (for minimal git diffs)
                repoResource.Resources = repoResource.Resources.OrderBy(r => r.Id).ToList();

                // Save resource
                _repository.SaveLanguageResource(org, app, language, JsonConvert.SerializeObject(repoResource, Formatting.Indented));
            }

            return Content( JsonConvert.SerializeObject(requestData));
        }

        /// <summary>
        /// Save a resource file
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code> )</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        [Obsolete]
        public IActionResult SaveResource([FromBody] dynamic jsonData, string id, string org, string app)
        {
#nullable disable
            id = id.Split('-')[0];
            JObject json = jsonData;

            JArray resources = json["resources"] as JArray;
            string[] duplicateKeys = resources.GroupBy(obj => obj["id"]).Where(grp => grp.Count() > 1).Select(grp => grp.Key.ToString()).ToArray();
            if (duplicateKeys.Length > 0)
            {
                return BadRequest($"Text keys must be unique. Please review keys: {string.Join(", ", duplicateKeys)}");
            }

            JArray sorted = new JArray(resources.OrderBy(obj => obj["id"]));
            json["resources"].Replace(sorted);

            // updating application metadata with appTitle.
            JToken appTitleToken = resources.FirstOrDefault(x => x.Value<string>("id") == "ServiceName");
            if (!(appTitleToken == null))
            {
                string appTitle = appTitleToken.Value<string>("value");
                _repository.UpdateAppTitle(org, app, id, appTitle);
            }

            _repository.SaveLanguageResource(org, app, id, json.ToString());

            return Json(new
            {
                Success = true,
                Message = "Språk lagret",
            });
#nullable restore
        }

        /// <summary>
        /// Deletes a language resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
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
        [Obsolete]
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
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        public IActionResult GetResource(string org, string app, string id)
        {
            id = id.Split('-')[0];
            var resource = _repository.GetLanguageResource(org, app, id);
            if (resource == null)
            {
                return Json(string.Empty);
            }

            return Json(resource, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore});
        }

        /// <summary>
        /// Returns all text resources for an app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Resources for the app</returns>
        [HttpGet]
        public IActionResult GetResources(string org, string app)
        {
            List<string> languages = _repository.GetLanguages(org, app);

            // TODO: see if I can use GetServiceTexts, or if returning texts from global and org is wrong
            // var serviceTexts = _repository.GetServiceTexts(org, app);
            var serviceTexts = new Dictionary<string, Dictionary<string, string>>();
            languages.ForEach(language =>
            {
                var resource = _repository.GetLanguageResource(org, app, language);
                if (resource == null)
                {
                    return;
                }

                resource.Resources.ForEach(element =>
                {
                    if (!serviceTexts.ContainsKey(element.Id))
                    {
                        serviceTexts[element.Id] = new Dictionary<string, string>();
                    }

                    serviceTexts[element.Id][language] = element.Value;
                });
            });

            return Json(serviceTexts);
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
            string defaultLang = "nb";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;
            string serviceName = string.Empty;

            var watch = System.Diagnostics.Stopwatch.StartNew();
            if (System.IO.File.Exists(serviceResourceDirectoryPath))
            {
                string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);
                ResourceCollection? textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);
                serviceName = textResourceObject?.Resources.FirstOrDefault(r => r.Id == "ServiceName")?.Value ?? string.Empty;

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
            string defaultLang = "nb";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;
            if (System.IO.File.Exists(serviceResourceDirectoryPath))
            {
                string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);

                ResourceCollection? textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);

                if (textResourceObject != null)
                {
                    textResourceObject.Add("ServiceName", serviceName.serviceName.ToString());
                }

                string resourceString = JsonConvert.SerializeObject(textResourceObject, _serializerSettings);

                _repository.SaveLanguageResource(org, app, "nb", resourceString);
            }
            else
            {
                ResourceCollection resourceCollection = new ResourceCollection
                {
                    Language = "nb",
                    Resources = new List<Resource> { new Resource { Id = "ServiceName", Value = serviceName.serviceName.ToString() } }
                };

                _repository.SaveLanguageResource(org, app, "nb", JsonConvert.SerializeObject(resourceCollection, _serializerSettings));
            }
        }
    }
}
