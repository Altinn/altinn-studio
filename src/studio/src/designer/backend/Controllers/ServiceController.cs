using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to basic configuration of an app.
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class ServiceController : Controller
    {
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service.</param>
        /// <param name="sourceControl">the source control service handler.</param>
        public ServiceController(IRepository repositoryService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
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
