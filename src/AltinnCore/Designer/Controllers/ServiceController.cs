using System.Collections.Generic;
using System.Linq;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to basic configuration of a service.
    /// </summary>
    [Authorize]
    public class ServiceController : Controller
    {
        private readonly IRepository _repository;
        private readonly ICompilation _compilation;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service.</param>
        /// <param name="compilationService">the compilation service handler.</param>
        /// <param name="sourceControl">the source control service handler.</param>
        public ServiceController(IRepository repositoryService, ICompilation compilationService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _compilation = compilationService;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// The index action which will list basic information about the service, as well as
        /// all possible operations on the service.
        /// </summary>
        /// <param name="org">The current service owner.</param>
        /// <param name="service">The current service.</param>
        /// <returns>A view with basic information and all available operations.</returns>
        public IActionResult Index(string org, string service)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, service);
            IList<ServicePackageDetails> packageDetails = _repository.GetServicePackages(org, service);
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.Service = service;
            model.Org = org;
            model.ServiceMetadata = metadata;

            if (_sourceControl.IsLocalRepo(org, service))
            {
                model.IsLocalRepo = true;
                model.RepositoryContent = _sourceControl.Status(org, service);
                _sourceControl.FetchRemoteChanges(org, service);
                model.CommitsBehind = _sourceControl.CheckRemoteUpdates(org, service);
            }

            ViewBag.HasCreatedResources = _repository.GetLanguages(org, service).Any();
            ViewBag.HasSetConfiguration = _repository.GetConfiguration(org, service, "basic.json") != null;
            ViewBag.PackageDetails = packageDetails;

            return View(model);
        }

        /// <summary>
        /// Creates a new service package using all the current service files.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="startServiceFlag">Flag to determine if the service should run/re-run.</param>
        /// <returns>Redirect to index.</returns>
        [HttpGet]
        public IActionResult CreateServicePackage(string org, string service, bool startServiceFlag)
        {
            _compilation.CreateServicePackage(org, service, startServiceFlag);
            return RedirectToAction("Index", new { org, service });
        }

        /// <summary>
        /// List GIT Status for a service.
        /// </summary>
        /// <param name="org">The current service owner.</param>
        /// <param name="service">The current service.</param>
        /// <returns>The view.</returns>
        [HttpGet]
        public IActionResult Status(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.RepositoryContent = _sourceControl.Status(org, service);
            model.CommitInfo = new CommitInfo() { Org = org, Repository = service };
            return View(model);
        }

        /// <summary>
        /// Get the changes in the remote repository.
        /// </summary>
        /// <param name="org">the organisation.</param>
        /// <param name="service">the service.</param>
        /// <returns>The service with changes.</returns>
        [HttpGet]
        public IActionResult PullRemoteChanges(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            _sourceControl.PullRemoteChanges(org, service);
            return RedirectToAction("index", new { Org = org, Service = service });
        }

        /// <summary>
        /// This method pushes changes to remote repository.
        /// </summary>
        /// <param name="commitInfo">The commit info.</param>
        /// <returns>Redirects back to the codelist front page.</returns>
        [HttpPost]
        public IActionResult PushChanges(CommitInfo commitInfo)
        {
            _sourceControl.PushChangesForRepository(commitInfo);
            return RedirectToAction("index", new { commitInfo.Org, Service = commitInfo.Repository });
        }

        /// <summary>
        /// clone a repository.
        /// </summary>
        /// <param name="org">the organisation.</param>
        /// <param name="service">the service.</param>
        /// <returns>The home app token page or the clone page.</returns>
        public IActionResult Clone(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            string token = _sourceControl.GetAppToken();

            if (!string.IsNullOrEmpty(token))
            {
                _sourceControl.CloneRemoteRepository(org, service);
            }
            else
            {
                return Redirect("/Home/AppToken");
            }

            return RedirectToAction("Index", new { org, service });
        }
    }
}
