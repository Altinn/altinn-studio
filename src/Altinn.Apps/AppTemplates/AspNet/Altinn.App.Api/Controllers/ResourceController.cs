using System;
using System.Globalization;
using System.IO;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller to handle resources like css, images, javascript included in an app
    /// </summary>
    public class ResourceController : ControllerBase
    {
        private readonly IAppResources _appResourceService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResourceController"/> class
        /// </summary>
        /// <param name="appResourcesService">The execution service</param>
        public ResourceController(IAppResources appResourcesService)
        {
            _appResourceService = appResourcesService;
        }

        /// <summary>
        /// Method to retrieve embedded content in app like images, css, fonts, +++++
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The name of the resource</param>
        /// <returns>File content with content type set</returns>
        [HttpGet]
        [Route("{org}/{app}/api/resource/{id}")]
        [HttpGet]
        public IActionResult Index(string org, string app, string id)
        {
            if (id == "FormLayout.json")
            {
                return GetLayouts(org, app);
            }

            byte[] fileContent = _appResourceService.GetAppResource(org, app, id);

            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            return StatusCode(404);
        }

        /// <summary>
        /// Method to retrieve the runtime resources
        /// </summary>
        /// <returns>File content with content type set</returns>
        /// TODO: Figure out if this can be deleted
        [HttpGet]
        [Route("{org}/{app}/api/runtimeresources/{id}/")]
        [HttpGet]
        public IActionResult GetRuntimeResource(string id)
        {
            byte[] fileContent = _appResourceService.GetRuntimeResource(id);

            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            return StatusCode(404);
        }

        /// <summary>
        /// Method to retrieve textresources
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The text resource file content or 404</returns>
        [HttpGet]
        [Route("{org}/{app}/api/textresources")]
        [Obsolete("TextResources endpoint is obsolete. Use endpoint in TextsController.")]
        [HttpGet]
        public IActionResult GetTextResources(string org, string app)
        {
            string defaultLang = "nb";
            string culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
            string id = $"resource.{culture}.json";
            byte[] fileContent = _appResourceService.GetText(org, app, id);
            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            id = $"resource.{defaultLang}.json";
            fileContent = _appResourceService.GetText(org, app, id);
            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            return StatusCode(404);
        }

        /// <summary>
        /// Get the model metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model metadata</returns>
        [HttpGet]
        [Route("{org}/{app}/api/metadata/{id}")]
        [Obsolete("Metadata endpoint is obsolete. Use jsonschema endpoint.")]
        public ActionResult GetModelMetadata([FromRoute] string org, [FromRoute] string app)
        {
            string metadata = _appResourceService.GetModelMetaDataJSON(org, app);
            return Ok(metadata);
        }

        /// <summary>
        /// Get the json schema for the model
        /// </summary>
        /// <param name="id">Unique identifier of the model to fetch json schema for.</param>
        /// <returns>The model json schema.</returns>
        [HttpGet]
        [Route("{org}/{app}/api/jsonschema/{id}")]
        public ActionResult GetModelJsonSchema([FromRoute] string id)
        {
            string schema = _appResourceService.GetModelJsonSchema(id);
            return Ok(schema);
        }

        /// <summary>
        /// Get the form layout
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A collection of FormLayout objects in JSON format.</returns>
        /// </summary>
        [HttpGet]
        [Route("{org}/{app}/api/layouts")]
        public ActionResult GetLayouts(string org, string app)
        {
          string layouts = _appResourceService.GetLayouts();
          return Ok(layouts);
        }

        /// <summary>
        /// Get the form layout
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The layoutset id</param>
        /// <returns>A collection of FormLayout objects in JSON format.</returns>
        [HttpGet]
        [Route("{org}/{app}/api/layouts/{id}")]
        public ActionResult GetLayouts(string org, string app, string id)
        {
            string layouts = _appResourceService.GetLayoutsForSet(id);
            return Ok(layouts);
        }

        /// <summary>
        /// Get the layout settings.
        /// </summary>
        /// <param name="org">The application owner short name</param>
        /// <param name="app">The application name</param>
        /// <returns>The settings in the form of a string.</returns>
        [HttpGet]
        [Route("{org}/{app}/api/layoutsettings")]
        public ActionResult GetLayoutSettings(string org, string app)
        {
            string settings = _appResourceService.GetLayoutSettingsString();
            return Ok(settings);
        }

        /// <summary>
        /// Get the layout settings.
        /// </summary>
        /// <param name="org">The application owner short name</param>
        /// <param name="app">The application name</param>
        /// <param name="id">The layoutset id</param>
        /// <returns>The settings in the form of a string.</returns>
        [HttpGet]
        [Route("{org}/{app}/api/layoutsettings/{id}")]
        public ActionResult GetLayoutSettings(string org, string app, string id)
        {
            string settings = _appResourceService.GetLayoutSettingsStringForSet(id);
            return Ok(settings);
        }

        /// <summary>
        /// Get the layout-sets
        /// </summary>
        /// <param name="org">The application owner short name</param>
        /// <param name="app">The application name</param>
        /// <returns>The settings in the form of a string.</returns>
        [HttpGet]
        [Route("{org}/{app}/api/layoutsets")]
        public ActionResult GetLayoutSets(string org, string app)
        {
            string settings = _appResourceService.GetLayoutSets();
            return Ok(settings);
        }

        /// <summary>
        /// Get the rule settings
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The layoutset id</param>
        /// <returns>A collection of FormLayout objects in JSON format.</returns>
        /// </summary>
        [HttpGet]
        [Route("{org}/{app}/api/rulehandler/{id}")]
        public ActionResult GetRulehandler(string org, string app, string id)
        {
            byte[] fileContent = _appResourceService.GetRuleHandlerForSet(id);
            if (fileContent != null)
            {
                return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(".ts"));
            }

            return StatusCode(404);
        }        
    }
}
