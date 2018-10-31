using System.Collections.Generic;
using System.Linq;
using System.Text;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all react-ions
    /// </summary>
    public class ReactController : Controller
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReactController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        public ReactController(IRepository repositoryService)
        {
            _repository = repositoryService;
        }

        /// <summary>
        /// The index action which will list basic information about the service, as well as
        /// all service editions for this service
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>A view with basic information and all service editions</returns>
        public IActionResult Index(string org, string service)
        {
            IList<EditionConfiguration> serviceEditions = _repository.GetEditions(org, service);
            return View(serviceEditions);
        }

        /// <summary>
        /// Action for displaying the page for creating a new service edition
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>A view containing a form for creating a service edition</returns>
        [HttpGet]
        public IActionResult CreateEdition(string org, string service)
        {
            return View();
        }

        /// <summary>
        /// Action which is used to create a new service edition
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <param name="editionConfig">The service edition configuration of the edition to create</param>
        /// <returns>If successful: a redirect to the created edition, if failure: the creation view with appropriate error messages</returns>
        [HttpPost]
        public IActionResult CreateEdition(string org, string service, EditionConfiguration editionConfig)
        {
            if (ModelState.IsValid)
            {
                IList<EditionConfiguration> editions = _repository.GetEditions(org, service);
                List<string> editionNames = editions.Select(edition => edition.Code).ToList();

                if (!editionNames.Contains(editionConfig.Code))
                {
                    _repository.CreateEdition(org, service, editionConfig);
                    var metadata = new ServiceMetadata
                    {
                        Edition = editionConfig.Code,
                        Org = org,
                        Service = service
                    };
                    _repository.CreateServiceMetadata(metadata);

                    return RedirectToAction("Index", "Edition", new { org, service, edition = editionConfig.Code });
                }
                else
                {
                    ViewBag.editionNameAlreadyExists = true;
                    return View();
                }
            }
            else
            {
                return View(editionConfig);
            }
        }

        /// <summary>
        /// Action for deleting a service edition
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <param name="id">The edition id delete</param>
        /// <returns>A view with basic information and all service editions</returns>
        [HttpGet]
        public IActionResult DeleteEdition(string org, string service, string id)
        {
            _repository.DeleteEdition(org, service, id);
            return RedirectToAction("Index", new { org, service });
        }


        /// <summary>
        /// Get form layout as JSON
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetFormLayout(string org, string service, string edition)
        {
            return Content(_repository.GetJsonFormLayout(org, service, edition), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get third party components listed as JSON
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetThirdPartyComponents(string org, string service, string edition)
        {
            return Content(_repository.GetJsonThirdPartyComponents(org, service, edition), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetRuleHandler(string org, string service, string edition)
        {
            return Content(_repository.GetRuleHandler(org, service, edition), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Get text resource as JSON for specified language
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The language id for the text resource file</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetTextResources(string org, string service, string edition, string id)
        {
            var result = _repository.GetResource(org, service, edition, id);
            return Content(result);
        }

        /// <summary>
        /// Save form layout as JSON
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveFormLayout([FromBody] dynamic jsonData, string org, string service, string edition)
        {
            _repository.SaveJsonFormLayout(org, service, edition, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Skjema lagret"
            });
        }

        /// <summary>
        /// Save form layout as JSON
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveThirdPartyComponents([FromBody] dynamic jsonData, string org, string service, string edition)
        {
            _repository.SaveJsonThirdPartyComponents(org, service, edition, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Tredjeparts komponenter lagret"
            });
        }

        /// <summary>
        /// Save JSON data as file
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="fileName">The filename to be saved as</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public ActionResult SaveJsonFile([FromBody] dynamic jsonData, string org, string service, string edition, string fileName)
        {
            _repository.SaveJsonFile(org, service, edition, jsonData.ToString(), fileName);

            return Json(new
            {
                Success = true,
                Message = fileName + " saved"
            });
        }

        /// <summary>
        /// Get JSON file in JSON structure
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="fileName">The filename to read from</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public ActionResult GetJsonFile(string org, string service, string edition, string fileName)
        {
            return Content(_repository.GetJsonFile(org, service, edition, fileName), "application/javascript", Encoding.UTF8);
        }


    }
}
