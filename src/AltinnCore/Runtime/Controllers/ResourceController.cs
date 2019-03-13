using System.Globalization;
using System.IO;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

/// <summary>
///
/// </summary>
namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Controller to handle resources like css, images, javascript included in a service
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
        /// Method to retrieve embedded content in service like images, css, fonts, +++++
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The name of the resource</param>
        /// <returns>File content with content type set</returns>
        public IActionResult Index(string org, string service, string id)
        {
            byte[] fileContent = _execution.GetServiceResource(org, service, id);

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
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <returns>The text resource file content or 404</returns>
        public IActionResult TextResources(string org, string service)
        {
            string defaultLang = "nb-NO";
            string culture = CultureInfo.CurrentUICulture.Name;
            string id = $"resource.{culture}.json";
            byte[] fileContent = _execution.GetServiceResource(org, service, id);
            if (fileContent != null)
            {
              return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            id = $"resource.{defaultLang}.json";
            fileContent = _execution.GetServiceResource(org, service, id);
            if (fileContent != null)
            {
              return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(Path.GetExtension(id).ToLower()));
            }

            return StatusCode(404);
        }

        /// <summary>
        /// Get the service meta data
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="texts">whether text is set</param>
        /// <param name="restrictions">whether  restrictions are set</param>
        /// <param name="attributes">whether attributes are set</param>
        /// <returns>The service metadata</returns>
        [HttpGet]
        public ActionResult ServiceMetaData(string org, string service, bool texts = true, bool restrictions = true, bool attributes = true)
        {
            ServiceMetadata metadata = _execution.GetServiceMetaData(org, service);
            return Json(metadata, new JsonSerializerSettings() { Formatting = Formatting.Indented });
        }
  }
}
