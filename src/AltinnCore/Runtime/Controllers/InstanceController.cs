using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Api;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using AltinnCore.ServiceLibrary.Workflow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling all runtime service events
    /// </summary>
    public class InstanceController : Controller
    {
        private readonly IRepository _repository;
        private readonly IAuthorization _authorization;
        private readonly IRegister _register;
        private readonly ILogger _logger;
        private readonly IForm _form;
        private readonly IExecution _execution;
        private readonly IArchive _archive;
        private readonly ITestdata _testdata;
        private readonly UserHelper _userHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWorkflowSI _workflowSI;
        private readonly IInstance _instance;
        private readonly IInstanceLocalDev _instanceLocal;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceController"/> class
        /// </summary>
        /// <param name="authorizationService">The authorizationService (set in Startup.cs)</param>
        /// <param name="logger">The logger (set in Startup.cs)</param>
        /// <param name="registerService">The registerService (set in Startup.cs)</param>
        /// <param name="formService">The form</param>
        /// <param name="repositoryService">The repository service (set in Startup.cs)</param>
        /// <param name="serviceExecutionService">The serviceExecutionService (set in Startup.cs)</param>
        /// <param name="profileService">The profileService (set in Startup.cs)</param>
        /// <param name="archiveService">The archive service</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testDataService">the test data service handler</param>
        /// <param name="workflowSI">the workflow service handler</param>
        /// <param name="instanceSI">the instance service handler</param>
        public InstanceController(
            IAuthorization authorizationService,
            ILogger<InstanceController> logger,
            IRegister registerService,
            IForm formService,
            IRepository repositoryService,
            IExecution serviceExecutionService,
            IProfile profileService,
            IArchive archiveService,
            ITestdata testDataService,
            IHttpContextAccessor httpContextAccessor,
            IWorkflowSI workflowSI,
            IInstance instanceSI,
            IInstanceLocalDev instanceLocalDevSI)
        {
            _authorization = authorizationService;
            _logger = logger;
            _register = registerService;
            _form = formService;
            _repository = repositoryService;
            _execution = serviceExecutionService;
            _userHelper = new UserHelper(profileService, _register);
            _archive = archiveService;
            _testdata = testDataService;
            _httpContextAccessor = httpContextAccessor;
            _workflowSI = workflowSI;
            _instance = instanceSI;
            _instanceLocal = instanceLocalDevSI;
        }

        /// <summary>
        /// Action used for SPA
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="instanceId">the instance id</param>
        /// <param name="view">name of the view</param>
        /// <param name="itemId">the item id</param>
        /// <returns>The react view or the receipt</returns>
        [Authorize(Policy = "InstanceRead")]
        public IActionResult EditSPA(string org, string service, Guid instanceId, string view, int? itemId)
        {
            // Make sure user cannot edit an archived instance
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            // TODO Add info for REACT app.
            return View();
        }

        /// <summary>
        /// Action where user can send in reporting service.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="instanceId">The instanceId.</param>
        /// <returns>Returns the Complete and send in View.</returns>
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> CompleteAndSendIn(string org, string service, Guid instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, instanceId, 0, requestContext, serviceContext, platformServices);

            // Identify the correct view
            // Getting the Form Data from database
            object serviceModel = _form.GetFormModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.UserContext.ReporteeId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            serviceImplementation.SetServiceModel(serviceModel);
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            ViewBag.FormID = instanceId;
            ViewBag.ServiceContext = serviceContext;

            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);
            return View();
        }

        /// <summary>
        /// This is the HttpPost version of the CompleteAndSendIn operation that
        /// is triggered when user press the send in option.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="instanceId">The instanceId.</param>
        /// <param name="view">The ViewName.</param>
        /// <returns>Redirect user to the receipt page.</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CompleteAndSendIn(string org, string service, Guid instanceId, string view)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = PopulateRequestContext(instanceId);

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, instanceId, 0, requestContext, serviceContext, platformServices);

            // Getting the Form Data from database
            object serviceModel = _form.GetFormModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.UserContext.ReporteeId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            serviceImplementation.SetServiceModel(serviceModel);

            ViewBag.FormID = instanceId;
            ViewBag.ServiceContext = serviceContext;

            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);
            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

            ApiResult apiResult = new ApiResult();
            if (ModelState.IsValid)
            {
                ServiceState currentState = _workflowSI.MoveServiceForwardInWorkflow(instanceId, org, service, requestContext.UserContext.ReporteeId);
                if (currentState.State == WorkflowStep.Archived)
                {
                    _archive.ArchiveServiceModel(serviceModel, instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.UserContext.ReporteeId);
                    apiResult.NextState = currentState.State;
                }
            }

            ModelHelper.MapModelStateToApiResult(ModelState, apiResult, serviceContext);

            if (apiResult.Status.Equals(ApiStatusType.ContainsError))
            {
                Response.StatusCode = 202;
            }
            else
            {
                Response.StatusCode = 200;
            }

            return new ObjectResult(apiResult);
        }

        /// <summary>
        /// Action method to present.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="instanceId">The instanceId.</param>
        /// <returns>The receipt view.</returns>
        public IActionResult Receipt(string org, string service, Guid instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, instanceId, 0, requestContext, serviceContext, platformServices);

            object serviceModel = _archive.GetArchivedServiceModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.Reportee.PartyId);
            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            ViewBag.ServiceInstance = formInstances.Find(i => i.ServiceInstanceID == instanceId);

            return View();
        }

        /// <summary>
        /// The start Service operation used to start services.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <returns>The start service View.</returns>
        [Authorize]
        public IActionResult StartService(string org, string service)
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext);
            var startServiceModel = new StartServiceModel
            {
                ReporteeList = _authorization
                    .GetReporteeList(userContext.UserId)
                    .Select(x => new SelectListItem
                    {
                        Text = x.ReporteeNumber + " " + x.ReporteeName,
                        Value = x.PartyID.ToString(),
                    })
                    .ToList(),
                ServiceID = org + "_" + service,
            };
            return View(startServiceModel);
        }

        /// <summary>
        /// This is the post operation for the start service.
        /// </summary>
        /// <param name="startServiceModel">The start service model.</param>
        /// <returns>Redirects to the new instance of a service or lookup service view.</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> StartService(StartServiceModel startServiceModel)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            bool startService = true;
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(startServiceModel.Org, startServiceModel.Service, startService);

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(startServiceModel.Org, startServiceModel.Service, startService);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);

            // Populate the reportee information
            requestContext.UserContext.Reportee = _register.GetParty(startServiceModel.ReporteeID);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it available in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, startServiceModel.Org, startServiceModel.Service);
            serviceImplementation.SetPlatformServices(platformServices);
            ViewBag.PlatformServices = platformServices;

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            object serviceModel = null;

            if (!string.IsNullOrEmpty(startServiceModel.PrefillKey))
            {
                _form.GetPrefill(
                    startServiceModel.Org,
                    startServiceModel.Service,
                    serviceImplementation.GetServiceModelType(),
                    startServiceModel.ReporteeID,
                    startServiceModel.PrefillKey);
            }

            if (serviceModel == null)
            {
                // If the service model was not loaded from prefill.
                serviceModel = serviceImplementation.CreateNewServiceModel();
            }

            // Assign service model to the implementation
            serviceImplementation.SetServiceModel(serviceModel);

            // Run Instansiation event
            await serviceImplementation.RunServiceEvent(ServiceEventType.Instantiation);

            // Run validate Instansiation event where
            await serviceImplementation.RunServiceEvent(ServiceEventType.ValidateInstantiation);

            // If ValidateInstansiation event has not added any errors the new form is saved and user is redirercted to the correct
            if (ModelState.IsValid)
            {
                if (serviceContext.WorkFlow.Any() && serviceContext.WorkFlow[0].StepType.Equals(StepType.Lookup))
                {
                    return RedirectToAction("Lookup", new { org = startServiceModel.Org, service = startServiceModel.Service });
                }

                Guid instanceId;
                Guid dataId;
                int instanceOwnerId = requestContext.UserContext.ReporteeId;
                if (requestContext.ServiceMode == RequestContext.Mode.Studio)
                {
                    // Create a new instance document
                    instanceId = _instanceLocal.InstantiateInstance(startServiceModel.Service, startServiceModel.Org, instanceOwnerId);                    

                    // Save instantiated form model
                    dataId = await _form.SaveFormModel(
                        serviceModel,
                        instanceId,
                        serviceImplementation.GetServiceModelType(),
                        startServiceModel.Org,
                        startServiceModel.Service,
                        requestContext.UserContext.ReporteeId,
                        Guid.Empty);

                    // Update instance with dataId
                    Instance instance = await _instanceLocal.GetInstance(startServiceModel.Service, startServiceModel.Org, instanceOwnerId, instanceId);
                    Data data = new Data
                    {
                        Id = dataId.ToString(),
                        ContentType = "application/Xml",
                        StorageUrl = "data/TestForm/",                        
                        CreatedBy = instanceOwnerId.ToString(),
                    };
                    Dictionary<string, Data> formData = new Dictionary<string, Data>();
                    formData.Add(dataId.ToString(), data);
                    instance.Data = new Dictionary<string, Dictionary<string, Data>>();
                    instance.Data.Add("TestForm", formData);

                    _instanceLocal.SaveInstance(instance, startServiceModel.Service, startServiceModel.Org, instanceOwnerId, instanceId);
                }
                else
                {
                    instanceId = await _instance.InstantiateInstance(startServiceModel.Service, requestContext.UserContext.ReporteeId.ToString());
                }

                ServiceState currentState = _workflowSI.InitializeService(instanceId, startServiceModel.Org, startServiceModel.Service, requestContext.UserContext.ReporteeId);
                string redirectUrl = _workflowSI.GetUrlForCurrentState(instanceId, startServiceModel.Org, startServiceModel.Service, currentState.State);
                return Redirect(redirectUrl);
            }

            startServiceModel.ReporteeList = _authorization.GetReporteeList(requestContext.UserContext.UserId)
               .Select(x => new SelectListItem
               {
                   Text = x.ReporteeNumber + " " + x.ReporteeName,
                   Value = x.PartyID.ToString(),
               }).ToList();

            HttpContext.Response.Cookies.Append("altinncorereportee", startServiceModel.ReporteeID.ToString());
            return View(startServiceModel);
        }

        /// <summary>
        /// Get the current state.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="instanceId">The instance id.</param>
        /// <param name="reporteeId">The reportee id.</param>
        /// <returns>An api response containing the current ServiceState.</returns>
        [Authorize]
        [HttpGet]
        public IActionResult GetCurrentState(string org, string service, Guid instanceId, int reporteeId)
        {
            return new ObjectResult(_workflowSI.GetCurrentState(instanceId, org, service, reporteeId));
        }

        /// <summary>
        /// Validate the model.
        /// </summary>
        /// <param name="org">the organisation.</param>
        /// <param name="service">the service.</param>
        /// <param name="instanceId">the instance id.</param>
        /// <returns>The api response.</returns>
        public async Task<IActionResult> ModelValidation(string org, string service, Guid instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            requestContext.Form = Request.Form;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            ViewBag.PlatformServices = platformServices;

            // Getting the populated form data from disk
            dynamic serviceModel = _form.GetFormModel(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.ReporteeId,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            serviceImplementation.SetServiceModel(serviceModel);

            // Do Model Binding and update form data
            await TryUpdateModelAsync(serviceModel);

            // ServiceEvent : HandleValidationEvent
            // Perform Validation defined by the service developer.
            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

            ApiResult apiResult = new ApiResult();
            ModelHelper.MapModelStateToApiResult(ModelState, apiResult, serviceContext);

            if (apiResult.Status.Equals(ApiStatusType.ContainsError))
            {
                Response.StatusCode = 202;
            }
            else
            {
                Response.StatusCode = 200;
            }

            return new ObjectResult(apiResult);
        }

        private RequestContext PopulateRequestContext(Guid instanceId)
        {
            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            if (Request.Method.Equals("post"))
            {
                requestContext.Form = Request.Form;
            }

            return requestContext;
        }

        private void PopulateViewBag(string org, string service, Guid instanceId, int? itemId, RequestContext requestContext, ServiceContext serviceContext, PlatformServices platformServices)
        {
            ViewBag.RequestContext = requestContext;
            ViewBag.ServiceContext = serviceContext;
            ViewBag.Org = org;
            ViewBag.Service = service;
            ViewBag.FormID = instanceId;
            ViewBag.PlatformServices = platformServices;

            if (itemId.HasValue)
            {
                ViewBag.ItemID = itemId.Value;
            }
        }
    }
}
