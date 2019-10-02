using System.Globalization;
using System.IO;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Controller to handle resources like css, images, javascript included in an app
    /// </summary>
    public class ResourceController : Controller
    {
        private readonly IExecution _execution;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResourceController"/> class
        /// </summary>
        /// <param name="executionService">The execution service</param>
        public ResourceController(IExecution executionService)
        {
            _execution = executionService;
        }

        /// <summary>
        /// Method to retrieve embedded content in app like images, css, fonts, +++++
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The name of the resource</param>
        /// <returns>File content with content type set</returns>
        public IActionResult Index(string org, string app, string id)
        {
            byte[] fileContent = _execution.GetServiceResource(org, app, id);

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
        public IActionResult RuntimeResource(string id)
        {
            byte[] fileContent = _execution.GetRuntimeResource(id);

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
        public IActionResult TextResources(string org, string app)
        {
            string defaultLang = "nb-NO";
            string culture = CultureInfo.CurrentUICulture.Name;
            string id = $"resource.{culture}.json";
            byte[] fileContent = _execution.GetServiceResource(org, app, id);
            if (fileContent != null)
            {
              return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            id = $"resource.{defaultLang}.json";
            fileContent = _execution.GetServiceResource(org, app, id);
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
        public ActionResult ServiceMetaData(string org, string app, bool texts = true, bool restrictions = true, bool attributes = true)
        {
            ServiceMetadata metadata = _execution.GetServiceMetaData(org, app);
            return Json(metadata, new JsonSerializerSettings() { Formatting = Formatting.Indented });
        }
  }
}
