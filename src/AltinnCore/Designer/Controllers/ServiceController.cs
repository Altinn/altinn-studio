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
    /// Controller containing all actions related to basic configuration of an app.
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
        /// The index action which will list basic information about the app, as well as
        /// all possible operations on the app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with basic information and all available operations.</returns>
        public IActionResult Index(string org, string app)
        {
            ModelMetadata metadata = _repository.GetModelMetadata(org, app);
            IList<ServicePackageDetails> packageDetails = _repository.GetServicePackages(org, app);
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.Service = app;
            model.Org = org;
            model.ServiceMetadata = metadata;

            if (_sourceControl.IsLocalRepo(org, app))
            {
                model.IsLocalRepo = true;
                model.RepositoryContent = _sourceControl.Status(org, app);
                _sourceControl.FetchRemoteChanges(org, app);
                model.CommitsBehind = _sourceControl.CheckRemoteUpdates(org, app);
            }

            ViewBag.HasCreatedResources = _repository.GetLanguages(org, app).Any();
            ViewBag.HasSetConfiguration = _repository.GetConfiguration(org, app, "basic.json") != null;
            ViewBag.PackageDetails = packageDetails;

            return View(model);
        }

        /// <summary>
        /// Creates a new service package using all the current app files.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="startAppFlag">Flag to determine if the app should run/re-run.</param>
        /// <returns>Redirect to index.</returns>
        [HttpGet]
        public IActionResult CreateServicePackage(string org, string app, bool startAppFlag)
        {
            _compilation.CreateServicePackage(org, app, startAppFlag);
            return RedirectToAction("Index", new { org, app });
        }

        /// <summary>
        /// List GIT Status for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The view.</returns>
        [HttpGet]
        public IActionResult Status(string org, string app)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.RepositoryContent = _sourceControl.Status(org, app);
            model.CommitInfo = new CommitInfo() { Org = org, Repository = app };
            return View(model);
        }

        /// <summary>
        /// Get the changes in the remote repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The app with changes.</returns>
        [HttpGet]
        public IActionResult PullRemoteChanges(string org, string app)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            _sourceControl.PullRemoteChanges(org, app);
            return RedirectToAction("index", new { Org = org, Service = app });
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The home app token page or the clone page.</returns>
        public IActionResult Clone(string org, string app)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            string token = _sourceControl.GetAppToken();

            if (!string.IsNullOrEmpty(token))
            {
                _sourceControl.CloneRemoteRepository(org, app);
            }
            else
            {
                return Redirect("/Home/AppToken");
            }

            return RedirectToAction("Index", new { org, app });
        }
    }
}
