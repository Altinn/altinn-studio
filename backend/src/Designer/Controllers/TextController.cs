using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for resources
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/text")]
    [Obsolete("TextController is deprecated, please use TextsController instead. Only in use until new texts format is implemented in apps.")]
    public class TextController : Controller
    {
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly ITextsService _textsService;
        private readonly JsonSerializerSettings _serializerSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextController"/> class.
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service.</param>
        /// <param name="repositoryService">The app repository service.</param>
        /// <param name="repositorySettings">The repository settings.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public TextController(IWebHostEnvironment hostingEnvironment, IRepository repositoryService, ServiceRepositorySettings repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<TextController> logger, ITextsService textsService)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repositoryService;
            _settings = repositorySettings;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _textsService = textsService;
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
        [HttpGet]
        [Route("/designer/{org}/{app:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/Text")]
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
        /// The languages in the app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>List of languages as JSON</returns>
        [HttpGet]
        [Route("languages")]
        public IActionResult GetLanguages(string org, string app)
        {
            List<string> languages = _repository.GetLanguages(org, app);
            return Json(languages);
        }

        /// <summary>
        /// Returns the a JSON resource file for the given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        [Route("language/{languageCode}")]
        public IActionResult GetResource(string org, string app, string languageCode)
        {
            string resourceJson = _repository.GetLanguageResource(org, app, languageCode);
            if (string.IsNullOrWhiteSpace(resourceJson))
            {
                resourceJson = string.Empty;
            }

            return Ok(resourceJson);
        }

        /// <summary>
        /// Save a resource file
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code> )</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        [Route("language/{languageCode}")]
        public IActionResult SaveResource([FromBody] dynamic jsonData, string languageCode, string org, string app)
        {
            languageCode = languageCode.Split('-')[0];
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
            JToken appTitleToken = resources.FirstOrDefault(x => x.Value<string>("id") == "appName" || x.Value<string>("id") == "ServiceName");

            if ((appTitleToken != null) && !(string.IsNullOrEmpty(appTitleToken.Value<string>("value"))))
            {
                string appTitle = appTitleToken.Value<string>("value");
                _repository.UpdateAppTitleInAppMetadata(org, app, languageCode, appTitle);
            }
            else
            {
                return BadRequest("The appliaction name must be a value.");
            }

            _repository.SaveLanguageResource(org, app, languageCode, json.ToString());

            return Ok("Resource saved");
        }

        /// <summary>
        /// Method to update multiple texts for given keys and a given
        /// language in the text resource files in the old format.
        /// Non-existing keys will be added.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="keysTexts">List of Key/Value pairs that should be updated or added if not present.</param>
        /// <param name="languageCode">The languageCode for the text resource file that is being edited.</param>
        /// <remarks>Temporary method that should live until old text format is replaced by the new.</remarks>
        [HttpPut]
        [Route("language/{languageCode}")]
        public IActionResult UpdateTextsForKeys(string org, string app, [FromBody] Dictionary<string, string> keysTexts, string languageCode)
        {
            try
            {
                string filename = $"resource.{languageCode}.json";
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                string textResourceDirectoryPath = _settings.GetLanguageResourcePath(org, app, developer) + filename;

                TextResource textResourceObject = new TextResource
                {
                    Language = languageCode,
                    Resources = new List<TextResourceElement>()
                };

                if (System.IO.File.Exists(textResourceDirectoryPath))
                {
                    string textResource = System.IO.File.ReadAllText(textResourceDirectoryPath, Encoding.UTF8);
                    textResourceObject = JsonConvert.DeserializeObject<TextResource>(textResource);
                }

                foreach (KeyValuePair<string, string> kvp in keysTexts)
                {
                    if ((kvp.Key == "appName" || kvp.Key == "serviceName") && string.IsNullOrEmpty(kvp.Value))
                    {
                        throw new ArgumentException("The application name must be a value.");
                    }

                    TextResourceElement textResourceContainsKey =
                        textResourceObject.Resources.Find(textResourceElement => textResourceElement.Id == kvp.Key);
                    if (textResourceContainsKey is null)
                    {
                        textResourceObject.Resources.Add(new TextResourceElement() { Id = kvp.Key, Value = kvp.Value });
                    }
                    else
                    {
                        int indexTextResourceElementUpdateKey = textResourceObject.Resources.IndexOf(textResourceContainsKey);
                        textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement() { Id = kvp.Key, Value = kvp.Value };
                    }
                }

                string resourceString = JsonConvert.SerializeObject(textResourceObject, _serializerSettings);

                _repository.SaveLanguageResource(org, app, languageCode, resourceString);

                return Ok($"The text resource, resource.{languageCode}.json, was updated.");

            }
            catch (ArgumentException exception)
            {
                return BadRequest(exception.Message);
            }
            catch (Exception)
            {
                return BadRequest($"The text resource, resource.{languageCode}.json, could not be updated.");
            }
        }

        /// <summary>
        /// Method to update multiple key-names
        /// Non-existing keys will be added.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="mutations">List of oldId: string, newId: string tuples to change or remove in all text-resource-files.</param>
        /// <remarks>If the newId is empty or undefined it implies that it is going to be removed</remarks>
        /// <remarks>Temporary method that should live until old text format is replaced by the new.</remarks>
        [HttpPut("keys")]
        public async Task<IActionResult> UpdateKeyNames(string org, string app, [FromBody] List<TextIdMutation> mutations)
        {
            bool mutationHasOccured = false;
            try
            {
                IList<string> langCodes = _repository.GetLanguages(org, app);
                foreach (string languageCode in langCodes)
                {
                    string filename = MakeResourceFilename(languageCode);
                    string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                    string filePath = MakeResourceFilePath(org, app, developer, filename);
                    if (!System.IO.File.Exists(filePath))
                    {
                        continue;
                    }

                    string textResource = System.IO.File.ReadAllText(filePath, Encoding.UTF8);
                    TextResource textResourceObject = JsonConvert.DeserializeObject<TextResource>(textResource);

                    foreach (TextIdMutation m in mutations)
                    {
                        if (m.OldId == "appName" || m.OldId == "serviceName")
                        {
                            throw new ArgumentException("You can not change the key representing the name of the application.");
                        }

                        int originalEntryIndex =
                            textResourceObject.Resources.FindIndex(textResourceElement =>
                                textResourceElement.Id == m.OldId);
                        if (originalEntryIndex == -1)
                        {
                            continue;
                        }

                        TextResourceElement textEntry = textResourceObject.Resources[originalEntryIndex];
                        if (m.NewId.HasValue && m.NewId.Value != "") // assign new key/id
                        {
                            textEntry.Id = m.NewId.Value;
                        }
                        else
                        {
                            textResourceObject.Resources.Remove(textEntry); //remove
                        }

                        mutationHasOccured = true;
                    }

                    await _textsService.UpdateRelatedFiles(org, app, developer, mutations);

                    string resourceString = JsonConvert.SerializeObject(textResourceObject, _serializerSettings);

                    _repository.SaveLanguageResource(org, app, languageCode, resourceString);
                }
            }
            catch (ArgumentException exception)
            {
                return BadRequest(exception.Message);
            }
            catch (Exception e)
            {
                return BadRequest($"The update could not be done:\n{e.StackTrace}");
            }

            return Ok(mutationHasOccured ? "The IDs were updated." : "Nothing was changed.");
        }

        private static string MakeResourceFilename(string langCode = "nb")
        {
            return $"resource.{langCode}.json";
        }

        private string MakeResourceFilePath(string org, string app, string developer, string filename)
        {
            return _settings.GetLanguageResourcePath(org, app, developer) + filename;
        }

        /// <summary>
        /// Deletes a language resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>Deletes a language resource</returns>
        [HttpDelete]
        [Route("language/{languageCode}")]
        public IActionResult DeleteLanguage(string org, string app, string languageCode)
        {
            if (_repository.DeleteLanguage(org, app, languageCode))
            {
                return Ok($"Resources.{languageCode}.json was successfully deleted.");
            }

            return BadRequest($"Resource.{languageCode}.json could not be deleted.");
        }

        /// <summary>
        /// Add text resources to existing resource documents
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="textResources">The collection of text resources to be added</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("language/add-texts")]
        [Obsolete("FormEditorController.AddTextResources is deprecated, please use TextController.UpdateTextsForKeys if only updating texts not keys")]
        public IActionResult AddTextResources(string org, string app, [FromBody] List<TextResource> textResources)
        {
            if (_repository.AddTextResources(org, app, textResources))
            {
                return Ok();
            }

            return BadRequest("Text resource could not be added.");
        }

        /// <summary>
        /// Get the JSON schema for resource files
        /// </summary>
        /// <returns>JSON content</returns>
        [HttpGet]
        [Route("json-schema")]
        public IActionResult GetResourceSchema()
        {
            string schema = System.IO.File.ReadAllText(_hostingEnvironment.WebRootPath + "/designer/json/schema/resource-schema.json");
            return Content(schema, "application/json", Encoding.UTF8);
        }

        /// <summary>
        /// Method to retrieve service name from textresources file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service name of the service</returns>
        [HttpGet]
        [Route("service-name")]
        public IActionResult GetServiceName(string org, string app)
        {
            string defaultLang = "nb";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;

            try
            {
                if (System.IO.File.Exists(serviceResourceDirectoryPath))
                {
                    string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);
                    ResourceCollection textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);
                    return Content(textResourceObject?.Resources?.FirstOrDefault(r => r.Id == "appName" || r.Id == "ServiceName")?.Value ?? string.Empty);
                }

                return Problem($"Working directory does not exist for {org}/{app}");
            }
            catch (JsonException ex)
            {
                return Problem(title: $"Failed to parse App/config/texts/{filename} as JSON", instance: $"App/config/texts/{filename}", detail: $"Failed to parse App/config/texts/{filename} as JSON\n" + ex.Message);
            }
        }

        /// <summary>
        /// Method to save the updated service name to the textresources file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceName">The service name</param>
        [HttpPost]
        [Route("service-name")]
        [Obsolete("SetServiceName is deprecated, please use UpdateTextsForKeys instead.")]
        public void SetServiceName(string org, string app, [FromBody] dynamic serviceName)
        {
            string defaultLang = "nb";
            string filename = $"resource.{defaultLang}.json";
            string serviceResourceDirectoryPath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + filename;
            if (System.IO.File.Exists(serviceResourceDirectoryPath))
            {
                string textResource = System.IO.File.ReadAllText(serviceResourceDirectoryPath, Encoding.UTF8);

                ResourceCollection textResourceObject = JsonConvert.DeserializeObject<ResourceCollection>(textResource);

                if (textResourceObject != null)
                {
                    // To keep old apps up to date with newer Studio where key, serviceName, is changed to appName
                    textResourceObject.Delete("serviceName");
                    textResourceObject.Add("appName", serviceName.serviceName.ToString());
                }

                string resourceString = JsonConvert.SerializeObject(textResourceObject, _serializerSettings);

                _repository.SaveLanguageResource(org, app, "nb", resourceString);
            }
            else
            {
                ResourceCollection resourceCollection = new ResourceCollection
                {
                    Language = "nb",
                    Resources = new List<Resource> { new Resource { Id = "appName", Value = serviceName.serviceName.ToString() } }
                };

                _repository.SaveLanguageResource(org, app, "nb", JsonConvert.SerializeObject(resourceCollection, _serializerSettings));
            }
        }
    }
}
