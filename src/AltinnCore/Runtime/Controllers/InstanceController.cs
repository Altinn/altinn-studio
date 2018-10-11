using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Api;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.ServiceMetadata;
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
        private readonly IViewRepository _viewRepository;
        private readonly IAuthorization _authorization;
        private readonly IRegister _register;
        private readonly ILogger _logger;
        private readonly IForm _form;
        private readonly IExecution _execution;
        private readonly IArchive _archive;
        private readonly ITestdata _testdata;
        private readonly UserHelper _userHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceController"/> class
        /// </summary>
        /// <param name="authorizationService">The authorizationService (set in Startup.cs)</param>
        /// <param name="logger">The logger (set in Startup.cs)</param>
        /// <param name="registerService">The registerService (set in Startup.cs)</param>
        /// <param name="formService">The form</param>
        /// <param name="repositoryService">The repository service (set in Startup.cs)</param>
        /// <param name="viewRepository">The view repository</param>
        /// <param name="serviceExecutionService">The serviceExecutionService (set in Startup.cs)</param>
        /// <param name="profileService">The profileService (set in Startup.cs)</param>
        /// <param name="archiveService">The archive service</param>
        public InstanceController(IAuthorization authorizationService, 
            ILogger<InstanceController> logger, 
            IRegister registerService, 
            IForm formService,
            IRepository repositoryService,
            IViewRepository viewRepository,
            IExecution serviceExecutionService,
            IProfile profileService,
            IArchive archiveService,
            ITestdata testDataService)
        {
            _authorization = authorizationService;
            _logger = logger;
            _register = registerService;
            _form = formService;
            _repository = repositoryService;
            _viewRepository = viewRepository;
            _execution = serviceExecutionService;
            _userHelper = new UserHelper(profileService, _register);
            _archive = archiveService;
            _testdata = testDataService;
        }


        /// <summary>
        /// Action used for SPA 
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <param name="edition"></param>
        /// <param name="instanceId"></param>
        /// <param name="view"></param>
        /// <param name="itemId"></param>
        /// <returns></returns>
        [Authorize(Policy = "InstanceRead")]
        public IActionResult EditSPA(string org, string service, string edition, int instanceId, string view, int? itemId)
        {
            // Make sure user cannot edit an archived instance
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service, edition);
            if (formInstances.FirstOrDefault(i => i.ServiceInstanceID == instanceId && i.IsArchived) != null)
            {
                return RedirectToAction("Receipt", new { org, service, edition, instanceId });
            }
            // TODO Add info for REACT app.
            return View();
        }


        /// <summary>
        /// This is the Action that is loaded when user access a given serviceInstance.
        /// This action is protected with the InstanceRead policy and the AuthorizationHandler
        /// verifies that the logged in user is Authorized to access this service instance (read)
        /// During this load up to 4 ServiceEvents in the current service implementation is run
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <param name="view">The ViewName</param>
        /// <param name="itemId">A optional itemId in cases </param>
        /// <returns>The RazorView for the given service</returns>
        [Authorize(Policy = "InstanceRead")]
        public async Task<IActionResult> Edit(string org, string service, string edition, int instanceId, string view, int? itemId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = PopulateRequestContext(instanceId);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, itemId, requestContext, serviceContext, platformServices);

            // Assign the RequestContext and ViewBag to the serviceImplementation so 
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Getting the Form Data from datastore 
            object serviceModel = this._form.GetFormModel(
                instanceId, 
                serviceImplementation.GetServiceModelType(),
                org, 
                service, 
                edition, 
                requestContext.UserContext.ReporteeId);
            
            // Assing the populated service model to the service implementation
            serviceImplementation.SetServiceModel(serviceModel);

            // ServiceEvent 1: HandleGetDataEvent 
            // Runs the event where the service developer can implement functionality to retrieve data from internal/external sources
            // based on the data in the service model
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // ServiceEvent 2: HandleCalculationEvent
            // Perform Calculation defined by the service developer
            await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

            // Capture which plattform user Action that was clicked 
            UserActionType userAction = RequestHelper.GetStandardUserAction(Request);

            if (userAction.Equals(UserActionType.Validate))
            {
                // ServiceEvent 3: HandleValidationEvent
                // If user was redirect to a view based on a link from validation message the
                // HandleValidationEvent needs to be runned so any validation errors can be presented
                // To the user for that given view
                await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

                // Run the model Validation that handles validation defined on the model
                TryValidateModel(serviceModel);
            }

            // Identify the correct View 
            ViewMetadata viewMetadata = serviceImplementation.GetView(view, UserActionType.Default);
            ViewBag.ViewID = viewMetadata;
            
            // If no view was supplied, reload this to ensure the current view is part of the URL
            if (string.IsNullOrEmpty(view))
            {
                if (string.IsNullOrEmpty(viewMetadata.Name))
                {
                    var defaultView = _viewRepository.GetViews(org, service, edition).FirstOrDefault();
                    if (defaultView != null)
                    {
                        viewMetadata = defaultView;
                    }
                }

                return RedirectToAction("Edit", new { instanceId, view = viewMetadata.Name });
            }

            // ServiceEvent 4: HandleBeforeRenderEvent
            // In this event ServiceDeveloper can implement any addition logic needed to be performed before 
            // rendering the form
            await serviceImplementation.RunServiceEvent(ServiceEventType.BeforeRender);

            // If the request is a AjaxRequest present the view as a partial view (without footer/header)
            if (Request.IsAjaxRequest())
            {
                return PartialView(GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Name), serviceModel);
            }
            
            // Add the layout file 
            ViewData.Add("Layout", GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Layout, false));

            // Returns the View that is identified by the serviceImplementation. Need to build the path so the 
            // Fileprovider is able to identify the correct service view
            return View(GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Name), serviceModel);
        }

        /// <summary>
        /// This is the Action where data is posted when user updates data in a form
        /// The method handles data binding and runs relevant ServiceEvents
        /// This method is Authorized so that 
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <param name="view">The name of the View</param>
        /// <param name="itemId">A optional itemId</param>
        /// <param name="uploadFiles">The uploaded files</param>
        /// <returns>Redirect to next view or the view containing validation events</returns>
        [Authorize(Policy = "InstanceWrite")]
        [HttpPost]
        public async Task<IActionResult> Edit(string org, string service, string edition, int instanceId, string view, int? itemId, IFormFileCollection uploadFiles)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Create and populate the RequestContext containing information about the request itself, who is the authenticated user, the form values+++
            RequestContext requestContext = PopulateRequestContext(instanceId);

            // Get the serviceContext containing all metadata about current service (Like translations, service codes)
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services (Services like GetCodeList)
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);
            
            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, itemId, requestContext, serviceContext, platformServices);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so 
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);
            
            // Reflection: Deserialize the XML data in data store to the DataModelType object defined as a C# model
            dynamic serviceModel = _form.GetFormModel(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                edition,
                requestContext.UserContext.ReporteeId);

            // ASP.Net MVC: Do Model Binding from FormValues and merge values with current model data
            await TryUpdateModelAsync(serviceModel);

            // Give service implementation access to the current data model
            serviceImplementation.SetServiceModel(serviceModel);
            
            // ServiceEvent 1: HandleGetDataEvent 
            // Runs the event where the service developer can implement functionality to retrieve data from internal/external sources
            // based on the data in the service model
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // ServiceEvent 2: HandleCalculationEvent
            // Perform Calculation defined by the service developer
            await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

            // ServiceEvent 3: HandleValidationEvent
            // Perform additional Validation defined by the service developer. 
            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

            // ASP.Net MVC : Run the model Validation that handles validation defined on the model and update modelState
            TryValidateModel(serviceModel);

            // Serialize the ServiceModel and store data to datastore
            this._form.SaveFormModel(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                edition,
                requestContext.UserContext.ReporteeId);

            // Capture which plattform user Action that was clicked 
            UserActionType userAction = RequestHelper.GetStandardUserAction(Request);

            // Identify the correct view for the current data
            ViewMetadata viewMetadata = serviceImplementation.GetView(view, userAction);

            // Identify the layout
            ViewData.Add("Layout", GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Layout, false));

            // If user has choosen to submit form but form is not valid. Show current view to present errors.
            if (userAction.Equals(UserActionType.Submit) && !ModelState.IsValid)
            {
                // If user press submit and form contains validation errors present current view
                return View(GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Name), serviceModel);
            }
            else if (userAction.Equals(UserActionType.Submit) && ModelState.IsValid)
            {
                // Temporary workaround for scenarios where there is now complete and sendin step.
                if (serviceContext.WorkFlow.Count == 1)
                {
                    _archive.ArchiveServiceModel(serviceModel, instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.UserContext.ReporteeId);
                    return RedirectToAction("Receipt", new { org, service, edition, instanceId });
                }

                // Redirect the user to the complete and sendin action if form is valid 
                return RedirectToAction("CompleteAndSendIn", new { org, service, edition, instanceId });
            }

            if (userAction.Equals(UserActionType.Validate))
            {
                // If user has pressed validate button
                return View(GetServiceViewPath(org, service, edition, instanceId, viewMetadata.Name), serviceModel);
            }

            // If modelstate is invalid, return current view with validation information
            if (!ModelState.IsValid)
            {
                return View(GetServiceViewPath(org, service, edition, instanceId, view), serviceModel);
            }

            // Redirect user to the HttpGet method so the form is reloaded with the correct view
            return RedirectToAction("Edit", new { org, service, edition, view = viewMetadata.Name });
        }

        /// <summary>
        /// Action where user can send in reporting service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <returns>Returns the Complete and send in View</returns>
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> CompleteAndSendIn(string org, string service, string edition, int instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, 0, requestContext, serviceContext, platformServices);

            // Identify the correct view
            // Getting the Form Data from database
            object serviceModel = _form.GetFormModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.UserContext.ReporteeId);
            serviceImplementation.SetServiceModel(serviceModel);
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            ViewBag.FormID = instanceId;
            ViewBag.ServiceContext = serviceContext;

            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation); 
            return View();
        }

        /// <summary>
        /// This is the HttpPost version of the CompleteAndSendIn operation that
        /// is triggered when user press the send in option
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <param name="view">The ViewName</param>
        /// <returns>Redirect user to the receipt page</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CompleteAndSendIn(string org, string service, string edition, int instanceId, string view)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = PopulateRequestContext(instanceId);

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);
            
            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, 0, requestContext, serviceContext, platformServices);

            //Getting the Form Data from database
            object serviceModel = _form.GetFormModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.UserContext.ReporteeId);
            serviceImplementation.SetServiceModel(serviceModel);
            
            ViewBag.FormID = instanceId;
            ViewBag.ServiceContext = serviceContext;

            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);
            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

            if (ModelState.IsValid)
            {
                _archive.ArchiveServiceModel(serviceModel, instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.UserContext.ReporteeId);
                
                return RedirectToAction("Receipt", new { org, service, edition, instanceId });
            }
            
            return View();
        }

        /// <summary>
        /// Action method to present
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <returns>The receipt view</returns>
        public IActionResult Receipt(string org, string service, string edition, int instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, 0, requestContext, serviceContext, platformServices);

            object serviceModel = _archive.GetArchivedServiceModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.Reportee.PartyId);
            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service, edition);
            ViewBag.ServiceInstance = formInstances.Find(i => i.ServiceInstanceID == instanceId);

            return View();
        }

        /// <summary>
        /// The operation to View print information
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <param name="viewID">The viewId</param>
        /// <returns>View print view</returns>
        [Authorize]
        public IActionResult ViewPrint(string org, string service, string edition, int instanceId, string viewID)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, instanceId, 0, requestContext, serviceContext, platformServices);

            //Getting the Form Data from database
            object serviceModel = _form.GetFormModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, edition, requestContext.UserContext.ReporteeId);
            serviceImplementation.SetServiceModel(serviceModel);

            serviceImplementation.GetView(viewID, UserActionType.Default);

            return View(_execution.GetRazorView(org, service, edition, viewID), serviceModel);
        }

        /// <summary>
        /// Method that presents a Lookup service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The view from service</returns>
        [Authorize]
        public async Task<IActionResult> Lookup(string org, string service, string edition)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Get the service context containing metadata about the service 
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            ViewBag.RequestContext = requestContext;
            ViewBag.ServiceContext = serviceContext;
            ViewBag.Org = org;
            ViewBag.Service = service;
            ViewBag.Edition = edition;

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, 0, 0, requestContext, serviceContext, platformServices);

            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = serviceImplementation.CreateNewServiceModel();
            serviceImplementation.SetServiceModel(serviceModel);

            // Assign the different context information to the service implementation making it possible for 
            // the service developer to take use of this information 
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Run the Data Retriavel event where service developer can potensial load any data without any user input
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // Get the specfic View, controlled by the service implementation
            ViewMetadata viewMetadata = serviceImplementation.GetView(null, UserActionType.Default);

            // Add the layout file 
            ViewData.Add("Layout", GetServiceViewPath(org, service, edition, 0, viewMetadata.Layout, false));
            return View(GetServiceViewPath(org, service, edition, 0, viewMetadata.Name), serviceModel);
        }

        /// <summary>
        /// The method that is triggered when there is a post back in a lookup service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="dummy">Dummy input</param>
        /// <returns>The View</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Lookup(string org, string service, string edition, string dummy)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Get the service context containing metadata about the service 
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            requestContext.Form = Request.Form;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, edition, 0, 0, requestContext, serviceContext, platformServices);
            
            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = serviceImplementation.CreateNewServiceModel();
            serviceImplementation.SetServiceModel(serviceModel);

            // Assign the different context information to the service implementation making it possible for 
            // the service developer to take use of this information 
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Do Model Binding and update form data
            await TryUpdateModelAsync(serviceModel);

            // Run the Data Retriavel event where service developer can potensial load any data without any user input
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // Get the specfic View, controlled by the service implementation
            ViewMetadata viewMetadata = serviceImplementation.GetView(null, UserActionType.Default);

            // Add the layout file 
            ViewData.Add("Layout", GetServiceViewPath(org, service, edition, 0, viewMetadata.Layout, false));
            return View(GetServiceViewPath(org, service, edition, 0, viewMetadata.Name), serviceModel);
        }

        /// <summary>
        /// The start Service operation used to start services
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The start service View</returns>
        [Authorize]
        public IActionResult StartService(string org, string service, string edition)
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext);
            var startServiceModel = new StartServiceModel
            {
                ReporteeList = _authorization
                    .GetReporteeList(userContext.UserId)
                    .Select(x => new SelectListItem
                    {
                        Text = x.ReporteeNumber + " " + x.ReporteeName,
                        Value = x.PartyID.ToString()
                    })
                    .ToList(),
                ServiceID = org + "_" + service + "_" + edition
                
            };
            return View(startServiceModel);
        }

        /// <summary>
        /// This is the post operation for the start service
        /// </summary>
        /// <param name="startServiceModel">The start service model</param>
        /// <returns>Redirects to the new instance of a service or lookup service view</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> StartService(StartServiceModel startServiceModel)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(startServiceModel.Org, startServiceModel.Service, startServiceModel.Edition);

            // Get the service context containing metadata about the service 
            ServiceContext serviceContext = _execution.GetServiceContext(startServiceModel.Org, startServiceModel.Service, startServiceModel.Edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);

            // Populate the reportee information 
            requestContext.UserContext.Reportee = _register.GetParty(startServiceModel.ReporteeID);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it available in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, startServiceModel.Org, startServiceModel.Service, startServiceModel.Edition);
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
                    startServiceModel.Edition,
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
                    return RedirectToAction("Lookup", new { org = startServiceModel.Org, service = startServiceModel.Service, edition = startServiceModel.Edition });
                }

                // Create a new instance Id
                int formID = _execution.GetNewServiceInstanceID(startServiceModel.Org, startServiceModel.Service, startServiceModel.Edition);

                _form.SaveFormModel(
                    serviceModel, 
                    formID, 
                    serviceImplementation.GetServiceModelType(), 
                    startServiceModel.Org, 
                    startServiceModel.Service, 
                    startServiceModel.Edition, 
                    requestContext.UserContext.ReporteeId);

                  return Redirect($"/runtime/{startServiceModel.Org}/{startServiceModel.Service}/{startServiceModel.Edition}/{formID}/#Preview");
            }

             startServiceModel.ReporteeList = _authorization.GetReporteeList(requestContext.UserContext.UserId)
                .Select(x => new SelectListItem
                {
                    Text = x.ReporteeNumber + " " + x.ReporteeName,
                    Value = x.PartyID.ToString()
                }).ToList();

            HttpContext.Response.Cookies.Append("altinncorereportee", startServiceModel.ReporteeID.ToString());
            return View(startServiceModel);
        }

        public async Task<IActionResult> ModelValidation(string org, string service, string edition, int instanceId)
        {
            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, edition);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            requestContext.Form = Request.Form;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, edition);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so 
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service, edition);
            serviceImplementation.SetPlatformServices(platformServices);

            ViewBag.PlatformServices = platformServices;

            // Getting the populated form data from database
            dynamic serviceModel = _form.GetFormModel(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                edition,
                requestContext.UserContext.ReporteeId);

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


        /// <summary>
        /// Method that builds the serviceView path 
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="serviceInstanceId">The ServiceInstanceId</param>
        /// <param name="viewName">The ViewName</param>
        /// <param name="getRazorView">The name of the RazorView</param>
        /// <returns>A viewPath that custom file provider understand to identify the correct view from data store</returns>
        private string GetServiceViewPath(string org, string service, string edition, int serviceInstanceId, string viewName, bool getRazorView = true)
        {
            string serviceKey = org + "_" + service + "_" + edition;
            if (getRazorView)
            {
                return "/ServiceView/" + serviceInstanceId + "/" + serviceKey + "/" + _execution.GetRazorView(org, service, edition, viewName);
            }
            else
            {
                return "/ServiceView/" + serviceInstanceId + "/" + serviceKey + "/" + viewName;
            }
        }

        private RequestContext PopulateRequestContext(int instanceId)
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

        private void PopulateViewBag(string org, string service, string edition, int instanceId, int? itemId, RequestContext requestContext, ServiceContext serviceContext, PlatformServices platformServices)
        {
            ViewBag.RequestContext = requestContext;
            ViewBag.ServiceContext = serviceContext;
            ViewBag.Org = org;
            ViewBag.Service = service;
            ViewBag.Edition = edition;
            ViewBag.FormID = instanceId;
            ViewBag.PlatformServices = platformServices;

            if (itemId.HasValue)
            {
                ViewBag.ItemID = itemId.Value;
            }
        }
    }
}
