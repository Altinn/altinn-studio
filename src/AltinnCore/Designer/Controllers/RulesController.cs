using System.Collections.Generic;
using System.Linq;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for all actions related to service rules
    /// </summary>
    [Authorize]
    public class RulesController : Controller
    {
        private readonly IRepository _repository;
        private readonly ICodeGeneration _codeGeneration;
        private readonly ICompilation _compilation;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RulesController"/> class
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        /// <param name="codeGenerationService">The code generation service</param>
        /// <param name="compilationService">The service compilation service</param>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        public RulesController(
            IRepository repositoryService,
            ICodeGeneration codeGenerationService,
            ICompilation compilationService,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor)
        {
            _repository = repositoryService;
            _codeGeneration = codeGenerationService;
            _compilation = compilationService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// The default action for this controller, returns a view with all rules for the given service
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>View containing details about all rules for the given service</returns>
        [HttpGet]
        public IActionResult Index(string org, string service)
        {
            IList<RuleContainer> rules = _repository.GetRules(org, service);
            return View(rules);
        }

        /// <summary>
        /// Action returning a view for creating new rules
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>View containing interface for creating a new rule</returns>
        [HttpGet]
        public IActionResult Create(string org, string service)
        {
            return View();
        }

        /// <summary>
        /// Action for creating a new rule
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="rule">The rule to be created</param>
        /// <returns>JSON representation of the created rule</returns>
        [HttpPost]
        public IActionResult Create(string org, string service, [FromBody]RuleContainer rule)
        {
            List<RuleContainer> existingRules = _repository.GetRules(org, service);

            if (existingRules == null)
            {
                existingRules = new List<RuleContainer>();
            }

            int id = 1;
            bool idFound = false;

            while (!idFound)
            {
                if (existingRules.FirstOrDefault(r => r.Id == id) == null)
                {
                    idFound = true;
                }
                else
                {
                    id++;
                }
            }

            rule.Id = id;
            existingRules.Add(rule);

            ServiceMetadata serviceMetadata = _repository.GetServiceMetaData(org, service);
            string rules = string.Empty;
            _codeGeneration.CreateCalculationsAndValidationsClass(org, service, existingRules, serviceMetadata);

            _repository.UpdateRules(org, service, existingRules);

            return Json(rule);
        }

        /// <summary>
        /// Action returning a view for updating rules
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="id">The id of the rule to update</param>
        /// <returns>View containing interface for updating a rule</returns>
        [HttpGet]
        public IActionResult Update(string org, string service, int id)
        {
            List<RuleContainer> rules = _repository.GetRules(org, service);
            RuleContainer rule = rules.FirstOrDefault(r => r.Id == id);

            return View(rule);
        }

        /// <summary>
        /// Action for creating a new rule
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="id">The id of the rule to update</param>
        /// <param name="rule">The rule to be created</param>
        /// <returns>JSON representation of the created rule</returns>
        [HttpPost]
        public IActionResult Update(string org, string service, int id, [FromBody]RuleContainer rule)
        {
            List<RuleContainer> existingRules = _repository.GetRules(org, service);

            if (existingRules == null)
            {
                existingRules = new List<RuleContainer>();
            }

            existingRules.RemoveAll(r => r.Id == rule.Id);
            existingRules.Add(rule);

            ServiceMetadata serviceMetadata = _repository.GetServiceMetaData(org, service);

            _codeGeneration.CreateCalculationsAndValidationsClass(org, service, existingRules, serviceMetadata);

            _repository.UpdateRules(org, service, existingRules);

            return Ok();
        }

        /// <summary>
        /// Gets a rule as JSON, identified by the supplied parameters
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="id">The id of the rule to get</param>
        /// <returns>The requested rule as JSON if it was found, 404 if it was not found</returns>
        [HttpGet]
        public IActionResult GetById(string org, string service, int id)
        {
            RuleContainer rule = _repository.GetRules(org, service)?.FirstOrDefault(r => r.Id == id);

            if (rule != null)
            {
                return Json(rule);
            }
            else
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Gets all rules for a given service as JSON
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>All rules for the given service</returns>
        [HttpGet]
        public IActionResult Get(string org, string service)
        {
            List<RuleContainer> rules = _repository.GetRules(org, service);

            if (rules != null)
            {
                return Json(rules);
            }
            else
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Gets all available rule types as JSON
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>All available rule types</returns>
        [HttpGet]
        public IActionResult GetRuleTypes(string org, string service)
        {
            return Json(_codeGeneration.GetRuleTypes());
        }

        /// <summary>
        /// Gets all available condition types as JSON
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>All available condition types</returns>
        [HttpGet]
        public IActionResult GetConditionTypes(string org, string service)
        {
            return Json(_codeGeneration.GetConditionTypes());
        }

        /// <summary>
        /// Presenting a view listing all implementation files
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>The View</returns>
        [HttpGet]
        public IActionResult Code(string org, string service)
        {
            List<AltinnCoreFile> altinnCoreFiles = _repository.GetImplementationFiles(org, service);
            CodeCompilationResult compResult = _compilation.CreateServiceAssembly(org, service, null, false);

            // Check to see if any of the files has compiliation errors or warnings
            foreach (AltinnCoreFile coreFile in altinnCoreFiles)
            {
                if (compResult.CompilationInfo != null
                    && compResult.CompilationInfo.Exists(c => c.FileName.ToLower().Equals(coreFile.FileName.ToLower()) && c.Severity.Equals("Error")))
                {
                    coreFile.FileStatus = ServiceLibrary.Enums.AltinnCoreFileStatusType.Error;
                }
                else if (compResult.CompilationInfo != null
                    && compResult.CompilationInfo.Exists(c => c.FileName.ToLower().Equals(coreFile.FileName.ToLower()) && c.Severity.Equals("Warning")))
                {
                    coreFile.FileStatus = ServiceLibrary.Enums.AltinnCoreFileStatusType.Warning;
                }
                else
                {
                    coreFile.FileStatus = ServiceLibrary.Enums.AltinnCoreFileStatusType.OK;
                }
            }

            string filePath = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
            ViewBag.HasDataModel = System.IO.File.Exists(filePath);
            ViewBag.CompilationResult = compResult;
            return View(altinnCoreFiles);
        }

        /// <summary>
        /// Presents a view for a specific implementation file
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="name">The file Name</param>
        /// <returns>The View</returns>
        public IActionResult File(string org, string service, string name)
        {
            ViewBag.FileName = name;
            return View();
        }

        /// <summary>
        /// This method returns the content of a file
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="name">The file name</param>
        /// <returns>The content of the file</returns>
        public IActionResult GetFile(string org, string service, string name)
        {
            if (name == "RuleHandler.js")
            {
                string fileContent = _repository.GetResourceFile(org, service, name);
                return Content(fileContent);
            }
            else
            {
                string fileContent = _repository.GetImplementationFile(org, service, name);
                return Content(fileContent);
            }
        }

        /// <summary>
        /// Updates a given
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <param name="fileName">The file name</param>
        /// <param name="fileContent">The file content</param>
        /// <returns>Status code</returns>
        [HttpPost]
        public IActionResult SaveImplementationFile(string org, string service, string fileName, string fileContent)
        {
            if (fileName == "RuleHandler.js")
            {
                _repository.SaveResourceFile(org, service, fileName, fileContent);
            }
            else
            {
                _repository.SaveImplementationFile(org, service, fileName, fileContent);
            }

            return StatusCode(200);
        }

        /// <summary>
        /// Compiles the implementation files
        /// </summary>
        /// <param name="org">The organization code for the requested service</param>
        /// <param name="service">The service short name for the requested service</param>
        /// <returns>A View with the result</returns>
        public IActionResult Compile(string org, string service)
        {
            CodeCompilationResult compResult = _compilation.CreateServiceAssembly(org, service, null, false);
            ViewBag.CompilationResult = compResult;
            return PartialView("CompilationResult");
        }
    }
}
