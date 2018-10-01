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
    /// Controller containing all actions related to basic configuration of a service
    /// </summary>
    public class ServiceController : Controller
    {
        private readonly IRepository _repository;
    private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        public ServiceController(IRepository repositoryService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// The index action which will list basic information about the service, as well as
        /// all service editions for this service
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>A view with basic information and all service editions</returns>
        [Authorize]
        public IActionResult Index(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.Service = service;
            model.Org = org;
            
              if (_sourceControl.IsLocalRepo(org, service))
                    {
                      model.IsLocalRepo = true;
                      model.ServiceEditions = _repository.GetEditions(org, service);
                      model.RepositoryContent = _sourceControl.Status(org, service);
                     _sourceControl.FetchRemoteChanges(org, service);
                      model.CommitsBehind = _sourceControl.CheckRemoteUpdates(org, service);
                  }

            return View(model);
        }
        
        /// <summary>
        /// Action for displaying the page for creating a new service edition
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>A view containing a form for creating a service edition</returns>
        [HttpGet]
        [Authorize]
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
        [Authorize]
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
        [Authorize]
        public IActionResult DeleteEdition(string org, string service, string id)
        {
            _repository.DeleteEdition(org, service, id);
            return RedirectToAction("Index", new {org, service});
        }

        /// <summary>
        /// List GIT Status for a service
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <returns>The view</returns>
        [HttpGet]
        [Authorize]
        public IActionResult Status(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.RepositoryContent = _sourceControl.Status(org, service);
            model.CommitInfo = new CommitInfo() { Org = org, Repository = service };
            return View(model);
        }

        [HttpGet]
        [Authorize]
        public IActionResult PullRemoteChanges(string org, string service)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            _sourceControl.PullRemoteChanges(org, service);
             return RedirectToAction("index", new { Org = org, Service = service });
        }


          /// <summary>
          /// This method pushes changes to remote repository
          /// </summary>
          /// <param name="commitInfo">The commit info</param>
          /// <returns>Redirects back to the codelist front page</returns>
          [HttpPost]
          [Authorize]
          public IActionResult PushChanges(CommitInfo commitInfo)
          {
            _sourceControl.PushChangesForRepository(commitInfo);
            return RedirectToAction("index", new { commitInfo.Org, Service = commitInfo.Repository });
          }

          [Authorize]
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
