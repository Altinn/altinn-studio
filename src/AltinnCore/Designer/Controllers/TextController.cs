using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for resources 
    /// </summary>
    public class TextController : Controller
    {
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextController"/> class
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service</param>
        /// <param name="repositoryService">The serviceRepository service</param>
        public TextController(IHostingEnvironment hostingEnvironment, IRepository repositoryService)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repositoryService;
        }

        /// <summary>
        /// The View for text resources
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The view with JSON editor</returns>
        public IActionResult Index(string org, string service, string edition)
        {
            IList<string> languages = _repository.GetLanguages(org, service, edition);

            if (Request.Headers["accept"] == "application/json")
            {
                Dictionary<string, Dictionary<string, string>> resources = _repository.GetServiceTexts(org, service, edition);
                return Json(resources);
            }

            return View(languages);
        }

        /// <summary>
        /// /// The languages in the edition
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>List of languages as JSON</returns>
        public IActionResult GetLanguages(string org, string service, string edition)
        {
            List<string> languages = _repository.GetLanguages(org, service, edition);
            return Json(languages);   
        }

        /// <summary>
        /// Save a resource file
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code> )</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        public IActionResult SaveResource([FromBody]dynamic jsonData, string id, string org, string service, string edition)
        {
            JObject json = jsonData;

            // Sort resource texts by id
            JArray resources = json["resources"] as JArray; 
            JArray sorted = new JArray(resources.OrderBy(obj => obj["id"]));
            json["resources"].Replace(sorted);

            _repository.SaveResource(org, service, edition, id, json.ToString());
            return Json(new
            {
                Success = true,
                Message = "Språk lagret"
            });
        }

        /// <summary>
        /// Deletes a language resource file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>Deletes a language resource</returns>
        [HttpDelete]
        public IActionResult DeleteLanguage(string org, string service, string edition, string id)
        {
            bool deleted = _repository.DeleteLanguage(org, service, edition, id);
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>The JSON config</returns>
        [HttpGet]
        public IActionResult GetResource(string org, string service, string edition, string id)
        {
            string resourceJson = _repository.GetResource(org, service, edition, id);
            if (string.IsNullOrWhiteSpace(resourceJson))
            {
                resourceJson = string.Empty;
            }

            JsonResult result = new JsonResult(resourceJson);
            return result;
        }
    }
}
