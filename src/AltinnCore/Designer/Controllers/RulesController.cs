using System.Collections.Generic;
using System.IO;
using System.Linq;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for all actions related to app rules
    /// </summary>
    [Authorize]
    public class RulesController : Controller
    {
        private readonly IRepository _repository;
        private readonly ICompilation _compilation;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RulesController"/> class
        /// </summary>
        /// <param name="repositoryService">The app repository service</param>
        /// <param name="compilationService">The app compilation service</param>
        /// <param name="repositorySettings">The app repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        public RulesController(
            IRepository repositoryService,
            ICompilation compilationService,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor)
        {
            _repository = repositoryService;
            _compilation = compilationService;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// The default action for this controller, returns a view with all rules for the given app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>View containing details about all rules for the given app.</returns>
        [HttpGet]
        public IActionResult Index(string org, string app)
        {
            IList<RuleContainer> rules = _repository.GetRules(org, app);
            return View(rules);
        }

        /// <summary>
        /// Action returning a view for creating new rules
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>View containing interface for creating a new rule</returns>
        [HttpGet]
        public IActionResult Create(string org, string app)
        {
            return View();
        }

        /// <summary>
        /// Action returning a view for updating rules
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The id of the rule to update</param>
        /// <returns>View containing interface for updating a rule</returns>
        [HttpGet]
        public IActionResult Update(string org, string app, int id)
        {
            List<RuleContainer> rules = _repository.GetRules(org, app);
            RuleContainer rule = rules.FirstOrDefault(r => r.Id == id);

            return View(rule);
        }

        /// <summary>
        /// Gets a rule as JSON, identified by the supplied parameters
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The id of the rule to get</param>
        /// <returns>The requested rule as JSON if it was found, 404 if it was not found</returns>
        [HttpGet]
        public IActionResult GetById(string org, string app, int id)
        {
            RuleContainer rule = _repository.GetRules(org, app)?.FirstOrDefault(r => r.Id == id);

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
        /// Gets all rules for a given app as JSON.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>All rules for the given app.</returns>
        [HttpGet]
        public IActionResult Get(string org, string app)
        {
            List<RuleContainer> rules = _repository.GetRules(org, app);

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
        /// Presenting a view listing all implementation files.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The View.</returns>
        [HttpGet]
        public IActionResult Code(string org, string app)
        {
            List<AltinnCoreFile> altinnCoreFiles = _repository.GetImplementationFiles(org, app);
            CodeCompilationResult compResult = _compilation.CreateServiceAssembly(org, app, false, null, false);

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

            string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
            ViewBag.HasDataModel = System.IO.File.Exists(filePath);
            ViewBag.CompilationResult = compResult;
            return View(altinnCoreFiles);
        }

        /// <summary>
        /// Presents a view for a specific implementation file.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The file Name</param>
        /// <returns>The View.</returns>
        public IActionResult File(string org, string app, string name)
        {
            ViewBag.FileName = name;
            return View();
        }

        /// <summary>
        /// This method returns the content of a file.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The file name.</param>
        /// <returns>The content of the file.</returns>
        public IActionResult GetFile(string org, string app, string name)
        {
            if (!ApplicationHelper.IsValidFilename(name))
            {
                return BadRequest();
            }

            if (name == "RuleHandler.js")
            {
                string fileContent = _repository.GetResourceFile(org, app, name);
                return Content(fileContent);
            }
            else
            {
                string fileContent = _repository.GetImplementationFile(org, app, name);
                return Content(fileContent);
            }
        }

        /// <summary>
        /// Updates a given implementation file or the rule handler file.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name.</param>
        /// <param name="fileContent">The file content.</param>
        /// <returns>Status code.</returns>
        [HttpPost]
        public IActionResult SaveImplementationFile(string org, string app, string fileName, string fileContent)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            if (fileName == "RuleHandler.js")
            {
                _repository.SaveResourceFile(org, app, fileName, fileContent);
            }
            else
            {
                _repository.SaveImplementationFile(org, app, fileName, fileContent);
            }

            return StatusCode(200);
        }

        /// <summary>
        /// Compiles the implementation files.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A View with the result.</returns>
        public IActionResult Compile(string org, string app)
        {
            CodeCompilationResult compResult = _compilation.CreateServiceAssembly(org, app, false, null, false);
            ViewBag.CompilationResult = compResult;
            return PartialView("CompilationResult");
        }
    }
}
