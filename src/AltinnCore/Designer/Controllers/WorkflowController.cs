using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for workflow 
    /// </summary>
    public class WorkflowController : Controller
    {
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IRepository _repository;
        private readonly IDefaultFileFactory _defaultFileFactory;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkflowController"/> class
        /// </summary>
        /// <param name="hostingEnvironment">The hosting environment service</param>
        /// <param name="repository">The serviceRepository service</param>
        /// <param name="settings">The service repository settings</param>
        /// <param name="defaultFileFactory">The default file factory</param>
        public WorkflowController(IHostingEnvironment hostingEnvironment, 
            IRepository repository,
            IOptions<ServiceRepositorySettings> settings,
            IDefaultFileFactory defaultFileFactory)
        {
            _hostingEnvironment = hostingEnvironment;
            _repository = repository;
            _defaultFileFactory = defaultFileFactory;
            _settings = settings.Value;
        }

        /// <summary>
        /// View for configuration of workflow
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The View for JSON editor</returns>
        public IActionResult Index(string org, string service, string edition)
        {
            return View();
        }

        /// <summary>
        /// Save workflow JSON
        /// </summary>
        /// <param name="jsonData">The JSON Data</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A View with update status</returns>
        [HttpPost]
        public IActionResult SaveWorkflow([FromBody]dynamic jsonData, string org, string service, string edition)
        {
            _repository.SaveConfiguration(org, service, edition, _settings.WorkFlowFileName, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Prosessflyt lagret"
            });
        }

        /// <summary>
        /// Get the JSON schema for workflow
        /// </summary>
        /// <returns>JSON content</returns>
        [HttpGet]
        public IActionResult Schema()
        {
            string schema = System.IO.File.ReadAllText(_hostingEnvironment.WebRootPath + "/designer/json/schema/workflow-schema.json");
            return Content(schema, "application/json", System.Text.Encoding.UTF8);
        }

        /// <summary>
        /// Returns the JSON workflow
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The JSON workflow</returns>
        [HttpGet]
        public IActionResult GetWorkflow(string org, string service, string edition)
        {
            var workflowJson = _repository.GetConfiguration(org, service, edition,  _settings.WorkFlowFileName);
            if (string.IsNullOrWhiteSpace(workflowJson))
            {
                var defaulFile = _defaultFileFactory.GetJsonDefaultFile(_settings.WorkFlowFileName, org);
                workflowJson = defaulFile.Exists ? System.IO.File.ReadAllText(defaulFile.FullName) : "{}";
            }

            return Json(workflowJson);
        }
    }
}
