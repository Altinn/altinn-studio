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
		/// The index action which will show the React form builder
		/// </summary>
		/// <param name="org">The current service owner</param>
		/// <param name="service">The current service</param>
		/// <returns>A view with the React form builder</returns>
		public IActionResult Index(string org, string service)
		{
			return View();
		}


		/// <summary>
		/// Get form layout as JSON
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
				Message = "Skjema lagret"
			});
		}

		/// <summary>
		/// Save form layout as JSON
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
				Message = "Tredjeparts komponenter lagret"
			});
		}

		/// <summary>
		/// Save JSON data as file
		/// <param name="jsonData">The code list data to save</param>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <param name="fileName">The filename to be saved as</param>
		/// <returns>A success message if the save was successful</returns>
		[HttpPost]
		public ActionResult SaveJsonFile([FromBody] dynamic jsonData, string org, string service, string fileName)
		{
			_repository.SaveJsonFile(org, service, jsonData.ToString(), fileName);

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
		/// <param name="fileName">The filename to read from</param>
		/// <returns>The model representation as JSON</returns>
		[HttpGet]
		public ActionResult GetJsonFile(string org, string service, string fileName)
		{
			return Content(_repository.GetJsonFile(org, service, fileName), "application/javascript", Encoding.UTF8);
		}


	}
}
