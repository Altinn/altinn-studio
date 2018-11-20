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
    /// Controller containing all actions related to basic configuration of a service owner
    /// </summary>
    public class OwnerController : Controller
    {
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="OwnerController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        /// <param name="sourceControl">the source control</param>
        public OwnerController(IRepository repositoryService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// Action which returns a view listing all services under the current service owner,
        /// and key information about the service owner
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <returns>
        /// A view containing basic information about the current service owner,
        /// and a list of all services under the current service owner
        /// </returns>
        [Authorize]
        public IActionResult Index(string org)
        {
            // IList<ServiceConfiguration> services = _repository.GetServices(org);
            return View();
        }

        /// <summary>
        /// Action which returns a form view for creating a new service under the
        /// current service owner
        /// </summary>
        /// <param name="org">The service owner code of the current service owner</param>
        /// <returns>A view for creating a new service under the current service owner</returns>
        [Authorize]
        [HttpGet]
        public IActionResult CreateService(string org)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            string token = _sourceControl.GetAppToken();
            if (string.IsNullOrEmpty(token))
            {
                model.MissingAppToken = true;
            }

            return View(model);
        }

        /// <summary>
        /// clone a remote repository to local
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="repo">the name of repository</param>
        /// <returns>The clone remote repoository view</returns>
        [Authorize]
        [HttpGet]
        public IActionResult CloneRemoteRepo(string org, string repo)
        {
            _sourceControl.CloneRemoteRepository(org, repo);
            return View();
        }

        /// <summary>
        /// Action used to create a new service under the current service owner
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="serviceConfiguration">The configuration of the service to create</param>
        /// <returns>
        /// A redirect to the created service if successful, reload of the same view if unsuccessful with appropriate error messages
        /// </returns>
        [Authorize]
        [HttpPost]
        public IActionResult CreateService(string org, ServiceConfiguration serviceConfiguration)
        {
            if (ModelState.IsValid)
            {
                string serviceName = serviceConfiguration.Code;
                IList<ServiceConfiguration> services = _repository.GetServices(org);
                List<string> serviceNames = services.Select(c => c.Code.ToLower()).ToList();
                bool serviceNameAlreadyExists = serviceNames.Contains(serviceName.ToLower());

                if (!serviceNameAlreadyExists)
                {
                    _repository.CreateService(org, serviceConfiguration);
                    var metadata = new ServiceMetadata
                    {
                        Org = org,
                        Service = serviceName,
                    };
                    _repository.CreateServiceMetadata(metadata);
                    return RedirectToAction("Index", "Service", new { org, service = serviceConfiguration.Code });
                }
                else
                {
                    ViewBag.serviceNameAlreadyExists = true;
                    return View();
                }
            }
            else
            {
                return View(serviceConfiguration);
            }
        }
    }
}
