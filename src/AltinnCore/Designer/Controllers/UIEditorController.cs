using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all react-ions
    /// </summary>
    [Authorize]
    public class UIEditorController : Controller
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="UIEditorController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        public UIEditorController(IRepository repositoryService)
        {
            _repository = repositoryService;
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>A view with the React form builder</returns>
        public IActionResult Index(string org, string service)
        {
            return RedirectToAction("Index", "ServiceDevelopment");
        }

        /// <summary>
        /// Get form layout as JSON
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetFormLayout(string org, string service)
        {
            return Content(_repository.GetJsonFormLayout(org, service), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get third party components listed as JSON
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetThirdPartyComponents(string org, string service)
        {
            return Content(_repository.GetJsonThirdPartyComponents(org, service), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetRuleHandler(string org, string service)
        {
            return Content(_repository.GetRuleHandler(org, service), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Get text resource as JSON for specified language
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The language id for the text resource file</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetTextResources(string org, string service, string id)
        {
            var result = _repository.GetResource(org, service, id);
            return Content(result);
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveFormLayout([FromBody] dynamic jsonData, string org, string service)
        {
            _repository.SaveJsonFormLayout(org, service, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Skjema lagret",
            });
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveThirdPartyComponents([FromBody] dynamic jsonData, string org, string service)
        {
            _repository.SaveJsonThirdPartyComponents(org, service, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Tredjeparts komponenter lagret",
            });
        }

        /// <summary>
        /// Save JSON data as file
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The filename to be saved as</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveJsonFile([FromBody] dynamic jsonData, string org, string service, string fileName)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            _repository.SaveJsonFile(org, service, jsonData.ToString(), fileName);

            return Json(new
            {
                Success = true,
                Message = fileName + " saved",
            });
        }

        /// <summary>
        /// Get JSON file in JSON structure
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The filename to read from</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetJsonFile(string org, string service, string fileName)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            return Content(_repository.GetJsonFile(org, service, fileName), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Adds the metadata for attachment
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">the organisation that owns the application</param>
        /// <param name="service">the application id</param>
        /// <returns></returns>
        [HttpPost]
        public ActionResult AddMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string service)
        {
            _repository.AddMetadataForAttachment(org, service, applicationMetadata.ToString());
            return Json(new
            {
                Success = true,
                Message = " Metadata saved",
            });
        }

        /// <summary>
        /// Updates the metadata for attachment
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">the organisation that owns the application</param>
        /// <param name="service">the application id</param>
        /// <returns></returns>
        [HttpPost]
        public ActionResult UpdateMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string service)
        {
            _repository.UpdateMetadataForAttachment(org, service, applicationMetadata.ToString());
            return Json(new
            {
                Success = true,
                Message = " Metadata saved",
            });
        }

        /// <summary>
        /// Deletes the metadata for attachment
        /// </summary>
        /// <param name="org">the organisation that owns the application</param>
        /// <param name="service">the application id</param>
        /// <param name="id">the id of the component</param>
        /// <returns></returns>
        [HttpPost]
        public ActionResult DeleteMetadataForAttachment(string org, string service, string id)
        {
            _repository.DeleteMetadataForAttachment(org, service, id);
            return Json(new
            {
                Success = true,
                Message = " Metadata saved",
            });
        }
    }
}
