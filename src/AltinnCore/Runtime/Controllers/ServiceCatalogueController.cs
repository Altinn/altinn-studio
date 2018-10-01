using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Api;
using AltinnCore.RepositoryClient.CustomApi;
using AltinnCore.ServiceLibrary.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// The default MVC controller in the application
    /// </summary>
    public class ServiceCatalogueController : Controller
    {
        private readonly IRepository _repository;
        private readonly IGitea _giteaApi;
        private ILogger<ServiceCatalogueController> _logger;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceCatalogueController"/> class
        /// </summary>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="logger">The logger</param>
        public ServiceCatalogueController(IRepository repositoryService, ILogger<ServiceCatalogueController> logger, IOptions<ServiceRepositorySettings> repositorySettings, IGitea giteaWrapper, IHttpContextAccessor httpContextAccessor)
        {
            _repository = repositoryService;
            _logger = logger;
            _settings = repositorySettings.Value;
            _giteaApi = giteaWrapper;
        }

        /// <summary>
        /// The default action presenting a list of available services
        /// </summary>
        /// <returns>The front page</returns>
        [Authorize]
        public ActionResult Index()
        {
            IList<OrgConfiguration> owners = _repository.GetOwners();
            return View(owners);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="org"></param>
        /// <returns></returns>
        [Authorize]
        public IActionResult Services(string org)
        {
            IList<ServiceConfiguration> services = _repository.GetServices(org);
            return View(services);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <returns></returns>
        public IActionResult Editions(string org, string service)
        {
            ViewBag.Org = org;
            ViewBag.Service = service;
            IList<EditionConfiguration> serviceEditions = _repository.GetEditions(org, service);
            return View(serviceEditions);
        }

        /// <summary>
        /// Action for presenting the Not Authorized View
        /// </summary>
        /// <returns>The view telling user that user was not authorized</returns>
        public IActionResult NotAuthorized()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting licensing information
        /// </summary>
        /// <returns>The Licensing view</returns>
        public IActionResult Licensing()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting documentation
        /// </summary>
        /// <returns>The Doc view</returns>
        public IActionResult Docs()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting information about the product
        /// </summary>
        /// <returns>The About view</returns>
        public IActionResult About()
        {
            return View();
        }

        /// <summary>
        /// Action for presenting error
        /// </summary>
        /// <returns>The Error view</returns>
        public IActionResult Error()
        {
            return View();
        }
     
     }
}
