using System.Globalization;
using System.IO;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.ServiceMetadata;
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
        /// Get the service metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="texts">whether text is set</param>
        /// <param name="restrictions">whether  restrictions are set</param>
        /// <param name="attributes">whether attributes are set</param>
        /// <returns>The service metadata</returns>
        [HttpGet]
        [Route("{org}/{app}/api/metadata/{id}")]
        public ActionResult ServiceMetaData([FromRoute] string org, [FromRoute] string app, [FromRoute] string id)
        {
            ServiceMetadata metadata = _appResourceService.GetServiceMetaData(org, app);
            return Ok(metadata);
        }
  }
}
