using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to configuration and creation of service editions
    /// </summary>
    public class EditionController : Controller
    {
        private readonly IRepository _repository;
        private readonly ICompilation _compilation;
        private readonly IViewRepository _viewRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditionController"/> class
        /// </summary>
        /// <param name="repositoryService">The ServiceRepositoryService</param>
        /// <param name="compilationService">The ServiceCompilationService</param>
        /// <param name="viewRepositoryService">The view repository</param>
        public EditionController(IRepository repositoryService, ICompilation compilationService, IViewRepository viewRepositoryService)
        {
            _repository = repositoryService;
            _compilation = compilationService;
            _viewRepository = viewRepositoryService;
        }

        /// <summary>
        /// The Details View for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The View</returns>
        [Authorize]
        [HttpGet]
        public IActionResult Index(string org, string service, string edition)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, service, edition);
            IList<ServicePackageDetails> packageDetails = _repository.GetServicePackages(org, service, edition);

            ViewBag.HasCreatedResources = _repository.GetLanguages(org, service, edition).Any();
            ViewBag.HasCreatedViews = _viewRepository.GetViews(org, service, edition).Any();
            ViewBag.HasSetConfiguration = _repository.GetConfiguration(org, service, edition, "basic.json") != null;
            ViewBag.PackageDetails = packageDetails;

            return View(metadata);
        }

          /// <summary>
          /// Creates a new service package using all the current service files
          /// </summary>
          /// <param name="org">The Organization code for the service owner</param>
          /// <param name="service">The service code for the current service</param>
          /// <param name="edition">The edition code for the current service</param>
          /// <returns>Redirect to index</returns>
        [Authorize]
        [HttpGet]
        public IActionResult CreateServicePackage(string org, string service, string edition)
        {
            _compilation.CreateServicePackage(org, service, edition);
            return RedirectToAction("Index", new { org, service, edition });
        }

        /// <summary>
        /// Get service metadata as JSON
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>ServiceMetadata as JSON</returns>
        [Authorize]
        public IActionResult GetMetadata(string org, string service, string edition)
        {
            return Json(_repository.GetServiceMetaData(org, service, edition));
        }
    }
}
