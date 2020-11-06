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
        [Route("{org}/{app}/api/resource/{id}")]
        public IActionResult Index(string org, string app, string id)
        {
            if (id == "FormLayout.json") {
                return Layouts(org, app);
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
        [Route("{org}/{app}/api/runtimeresources/{id}/")]
        public IActionResult RuntimeResource(string id)
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
        [Route("{org}/{app}/api/textresources")]
        [Obsolete("TextResources endpoint is obsolete. Use endpoint in TextsController.")]
        public IActionResult TextResources(string org, string app)
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
        public ActionResult ModelMetadata([FromRoute] string org, [FromRoute] string app)
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
        public ActionResult ModelJsonSchema([FromRoute] string id)
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
        public ActionResult Layouts(string org, string app)
        {
          string layouts = _appResourceService.GetLayouts();
          return Ok(layouts);
        }

        [HttpGet]
        [Route("{org}/{app}/api/layoutsettings")]
        public ActionResult LayoutSettings(string org, string app)
        {
            string settings = _appResourceService.GetLayoutSettings();
            return Ok(settings);
        }
    }
}
