using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Attributes;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Api;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

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
        private readonly IProfile _profile;
        private readonly IER _er;
        private readonly ILogger _logger;
        private readonly IForm _form;
        private readonly IExecution _execution;
        private readonly IArchive _archive;
        private readonly ITestdata _testdata;
        private readonly UserHelper _userHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWorkflow _workflowSI;
        private readonly IInstance _instance;
        private readonly IInstanceEvent _event;
        private readonly IPlatformServices _platformSI;
        private readonly IData _data;
        private readonly ServiceRepositorySettings _settings;

        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceController"/> class
        /// </summary>
        /// <param name="authorizationService">The authorizationService (set in Startup.cs)</param>
        /// <param name="logger">The logger (set in Startup.cs)</param>
        /// <param name="profileService">The profile service (set in Startup.cs)</param>
        /// <param name="registerService">The registerService (set in Startup.cs)</param>
        /// <param name="erService">The erService (set in Startup.cs)</param>
        /// <param name="formService">The form</param>
        /// <param name="repositoryService">The repository service (set in Startup.cs)</param>
        /// <param name="serviceExecutionService">The serviceExecutionService (set in Startup.cs)</param>
        /// <param name="archiveService">The archive service</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testDataService">the test data service handler</param>
        /// <param name="workflowSI">the workflow service handler</param>
        /// <param name="instanceSI">the instance service handler</param>
        /// <param name="eventSI">the instance event service handler</param>
        /// <param name="platformSI">the platform service handler</param>
        /// <param name="dataSI">the data service handler</param>
        /// <param name="repositorySettings">the repository settings</param>
        public InstanceController(
            IAuthorization authorizationService,
            ILogger<InstanceController> logger,
            IProfile profileService,
            IRegister registerService,
            IER erService,
            IForm formService,
            IRepository repositoryService,
            IExecution serviceExecutionService,
            IArchive archiveService,
            ITestdata testDataService,
            IHttpContextAccessor httpContextAccessor,
            IWorkflow workflowSI,
            IInstance instanceSI,
            IInstanceEvent eventSI,
            IPlatformServices platformSI,
            IData dataSI,
            IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _authorization = authorizationService;
            _logger = logger;
            _profile = profileService;
            _register = registerService;
            _er = erService;
            _form = formService;
            _repository = repositoryService;
            _execution = serviceExecutionService;
            _userHelper = new UserHelper(profileService, _register);
            _archive = archiveService;
            _testdata = testDataService;
            _httpContextAccessor = httpContextAccessor;
            _workflowSI = workflowSI;
            _instance = instanceSI;
            _event = eventSI;
            _platformSI = platformSI;
            _data = dataSI;
            _settings = repositorySettings.Value;
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
        [Authorize]
        public async Task<IActionResult> EditSPA(string org, string service, Guid instanceId, string view, int? itemId)
        {
            ViewBag.Org = org;
            ViewBag.App = service;

            // TODO Add info for REACT app.
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
            RequestContext requestContext = await PopulateRequestContext(instanceId);

            serviceImplementation.SetPlatformServices(_platformSI);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, instanceId, 0, requestContext, serviceContext, _platformSI);

            // Getting the Form Data
            Instance instance = await _instance.GetInstance(service, org, requestContext.UserContext.ReporteeId, instanceId);
            Guid.TryParse(instance.Data.Find(m => m.ElementType == FORM_ID).Id, out Guid dataId);
            object serviceModel = _data.GetFormData(instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.UserContext.ReporteeId, dataId);
            serviceImplementation.SetServiceModel(serviceModel);

            ViewBag.FormID = instanceId;
            ViewBag.ServiceContext = serviceContext;

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

            ApiResult apiResult = new ApiResult();
            if (ModelState.IsValid)
            {
                ServiceState currentState = _workflowSI.MoveServiceForwardInWorkflow(instanceId, org, service, requestContext.UserContext.ReporteeId);

                if (currentState.State == WorkflowStep.Archived)
                {
                    await _instance.ArchiveInstance(serviceModel, serviceImplementation.GetServiceModelType(), service, org, requestContext.UserContext.ReporteeId, instanceId);
                    apiResult.NextState = currentState.State;
                }

                // Create and store the instance submitted event
                InstanceEvent instanceEvent = new InstanceEvent
                {
                    AuthenticationLevel = requestContext.UserContext.AuthenticationLevel,
                    EventType = InstanceEventType.Submited.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerId = instance.InstanceOwnerId.ToString(),
                    UserId = requestContext.UserContext.UserId,
                    WorkflowStep = instance.Workflow.CurrentStep,
                };

                await _event.SaveInstanceEvent(instanceEvent, org, service);
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
        public async Task<IActionResult> Receipt(string org, string service, Guid instanceId)
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
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            serviceImplementation.SetPlatformServices(_platformSI);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            PopulateViewBag(org, service, instanceId, 0, requestContext, serviceContext, _platformSI);

            object serviceModel = _archive.GetArchivedServiceModel(instanceId, serviceImplementation.GetServiceModelType(), org, service, requestContext.Reportee.PartyId);
            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service);
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
        public async Task<IActionResult> StartService(string org, string service)
        {
            UserContext userContext = await _userHelper.GetUserContext(HttpContext);
            var startServiceModel = new StartServiceModel
            {
                PartyList = _authorization
                    .GetPartyList(userContext.UserId)
                    .Select(x => new SelectListItem
                    {
                        Text = (x.PartyTypeName == PartyType.Person) ? x.SSN + " " + x.Person.Name : x.OrgNumber + " " + x.Organization.Name,
                        Value = x.PartyId.ToString(),
                    })
                    .ToList(),
                ServiceID = org + "_" + service,
            };
            return View(startServiceModel);
        }

        /// <summary>
        /// This is the post operation to instantiate an instance
        /// </summary>
        /// <param name="startServiceModel">The start service model.</param>
        /// <returns>JSON Object with the instance ID</returns>
        [Authorize]
        [HttpPost]
        public async Task<dynamic> InstantiateApp(StartServiceModel startServiceModel)
        {
            _logger.LogInformation($"//InstanceController  // InstanciateApp // Starting function");

            // Dependency Injection: Getting the Service Specific Implementation based on the service parameter data store
            // Will compile code and load DLL in to memory for AltinnCore
            bool startService = true;
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(startServiceModel.Org, startServiceModel.Service, startService);

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completefd GetServiceImplementation");

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(startServiceModel.Org, startServiceModel.Service, startService);

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completed GetServiceContext6");

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completed Get UserContext ");

            // Populate the reportee information
            requestContext.UserContext.Reportee = await _register.GetParty(startServiceModel.PartyId);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completed GetParty");

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it available in ViewBag so it can be used from Views
            serviceImplementation.SetPlatformServices(_platformSI);

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completed SetPlatformServices");

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            object serviceModel = null;

            _logger.LogInformation($"//InstanceController  // InstanciateApp // Completed SetContext");
            if (!string.IsNullOrEmpty(startServiceModel.PrefillKey))
            {
                _form.GetPrefill(
                    startServiceModel.Org,
                    startServiceModel.Service,
                    serviceImplementation.GetServiceModelType(),
                    startServiceModel.PartyId,
                    startServiceModel.PrefillKey);
            }

            _logger.LogInformation($"//InstanceController  // InstanciateApp // CompletedGetPrefill");
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
                    return JsonConvert.SerializeObject(
                        new
                        {
                            org = startServiceModel.Org,
                            service = startServiceModel.Service
                        });
                }

                int instanceOwnerId = requestContext.UserContext.ReporteeId;

                // Create a new instance document
                Instance instance = await _instance.InstantiateInstance(startServiceModel, serviceModel, serviceImplementation);

                _logger.LogInformation($"//InstanceController // InstantiateApp // instance is null =  {instance == null}");

                // Create and store the instance created event
                InstanceEvent instanceEvent = new InstanceEvent
                {
                    AuthenticationLevel = requestContext.UserContext.AuthenticationLevel,
                    EventType = InstanceEventType.Created.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerId = instanceOwnerId.ToString(),
                    UserId = requestContext.UserContext.UserId,
                    WorkflowStep = instance.Workflow.CurrentStep
                };

                await _event.SaveInstanceEvent(instanceEvent, startServiceModel.Org, startServiceModel.Service);

                Enum.TryParse<WorkflowStep>(instance.Workflow.CurrentStep, out WorkflowStep currentStep);

                return JsonConvert.SerializeObject(
                    new
                    {
                        instanceId = instance.Id,
                    });
            }

            startServiceModel.PartyList = _authorization.GetPartyList(requestContext.UserContext.UserId)
               .Select(x => new SelectListItem
               {
                   Text = (x.PartyTypeName == PartyType.Person) ? x.SSN + " " + x.Person.Name : x.OrgNumber + " " + x.Organization.Name,
                   Value = x.PartyId.ToString(),
               }).ToList();

            HttpContext.Response.Cookies.Append("altinncorereportee", startServiceModel.PartyId.ToString());

            return JsonConvert.SerializeObject(
                new
                {
                    redirectUrl = View(startServiceModel),
                });
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
            _logger.LogInformation("// 404 // Entered start service");

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
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);

            // Populate the reportee information
            requestContext.UserContext.Reportee = await _register.GetParty(startServiceModel.PartyId);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it available in ViewBag so it can be used from Views
            serviceImplementation.SetPlatformServices(_platformSI);

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            _logger.LogInformation(" // 404 // All context set. Passed line 316");
            object serviceModel = null;

            if (!string.IsNullOrEmpty(startServiceModel.PrefillKey))
            {
                _form.GetPrefill(
                    startServiceModel.Org,
                    startServiceModel.Service,
                    serviceImplementation.GetServiceModelType(),
                    startServiceModel.PartyId,
                    startServiceModel.PrefillKey);
            }

            if (serviceModel == null)
            {
                // If the service model was not loaded from prefill.
                serviceModel = serviceImplementation.CreateNewServiceModel();
            }

            _logger.LogInformation(" // 404 // Set service model. Passed line 333");

            // Assign service model to the implementation
            serviceImplementation.SetServiceModel(serviceModel);
            _logger.LogInformation(" // 404 // Completed assign service model to the implementation");

            // Run Instansiation event
            await serviceImplementation.RunServiceEvent(ServiceEventType.Instantiation);
            _logger.LogInformation(" // 404 // Completed: Run Instansiation event");

            // Run validate Instansiation event where
            await serviceImplementation.RunServiceEvent(ServiceEventType.ValidateInstantiation);
            _logger.LogInformation(" // 404 // Completed:  Run validate Instansiation event where");

            // If ValidateInstansiation event has not added any errors the new form is saved and user is redirercted to the correct
            if (ModelState.IsValid)
            {
                if (serviceContext.WorkFlow.Any() && serviceContext.WorkFlow[0].StepType.Equals(StepType.Lookup))
                {
                    return RedirectToAction("Lookup", new { org = startServiceModel.Org, service = startServiceModel.Service });
                }

                int instanceOwnerId = requestContext.UserContext.ReporteeId;

                // Create a new instance document
                Instance instance = await _instance.InstantiateInstance(startServiceModel, serviceModel, serviceImplementation);
                _logger.LogInformation(" // 404 // Completed: Create a new instance document");

                // Create and store the instance created event
                InstanceEvent instanceEvent = new InstanceEvent
                {
                    AuthenticationLevel = requestContext.UserContext.AuthenticationLevel,
                    EventType = InstanceEventType.Created.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerId = instanceOwnerId.ToString(),
                    UserId = requestContext.UserContext.UserId,
                    WorkflowStep = instance.Workflow.CurrentStep
                };

                await _event.SaveInstanceEvent(instanceEvent, startServiceModel.Org, startServiceModel.Service);
                _logger.LogInformation(" // 404 // Completed: Save instance event. ");

                Enum.TryParse<WorkflowStep>(instance.Workflow.CurrentStep, out WorkflowStep currentStep);

                string redirectUrl = _workflowSI.GetUrlForCurrentState(Guid.Parse(instance.Id), startServiceModel.Org, startServiceModel.Service, currentStep);
                _logger.LogInformation($" // 404 // Set redirect url: {redirectUrl} ");
                return Redirect(redirectUrl);
            }

            startServiceModel.PartyList = _authorization.GetPartyList(requestContext.UserContext.UserId)
               .Select(x => new SelectListItem
               {
                   Text = (x.PartyTypeName == PartyType.Person) ? x.SSN + " " + x.Person.Name : x.OrgNumber + " " + x.Organization.Name,
                   Value = x.PartyId.ToString(),
               }).ToList();

            HttpContext.Response.Cookies.Append("altinncorereportee", startServiceModel.PartyId.ToString());
            _logger.LogInformation($" // 404 // Setting startService Model view: {startServiceModel} ");
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
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            requestContext.Form = Request.Form;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            serviceImplementation.SetPlatformServices(_platformSI);
            Instance instance = await _instance.GetInstance(service, org, requestContext.UserContext.ReporteeId, instanceId);
            Guid.TryParse(instance.Data.Find(m => m.ElementType == FORM_ID).Id, out Guid dataId);

            // Getting the populated form data from disk
            dynamic serviceModel = _data.GetFormData(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.ReporteeId,
                dataId);

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
        /// Method that receives the form attachment from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The name of the attachment</param>
        /// <returns>The status of the upload and guid of attachment</returns>
        [HttpPost]
        [Authorize]
        [DisableFormValueModelBinding]
        public async System.Threading.Tasks.Task<IActionResult> SaveFormAttachment(string org, string service, int partyId, Guid instanceId, string attachmentType, string attachmentName)
        {
            Guid guid = await _data.SaveFormAttachment(org, service, partyId, instanceId, attachmentType, attachmentName, Request);

            return Ok(new { id = guid });
        }

        /// <summary>
        /// Method that removes a form attachment from designer disk
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentId">The attachment id</param>
        /// <returns>The status of the deletion</returns>
        [HttpPost]
        [Authorize]
        [DisableFormValueModelBinding]
        public IActionResult DeleteFormAttachment(string org, string service, int partyId, Guid instanceId, string attachmentType, string attachmentId)
        {
            _data.DeleteFormAttachment(org, service, partyId, instanceId, attachmentType, attachmentId);
            return Ok();
        }

        /// <summary>
        /// Method that gets metadata on form attachments form designer disk
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        [HttpGet]
        [Authorize]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> GetFormAttachments(string org, string service, int partyId, Guid instanceId)
        {
            List<AttachmentList> allAttachments = await _data.GetFormAttachments(org, service, partyId, instanceId);
            return Ok(allAttachments);
        }

        private async Task<RequestContext> PopulateRequestContext(Guid instanceId)
        {
            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;
            if (Request.Method.Equals("post"))
            {
                requestContext.Form = Request.Form;
            }

            return requestContext;
        }

        private void PopulateViewBag(string org, string service, Guid instanceId, int? itemId, RequestContext requestContext, ServiceContext serviceContext, IPlatformServices platformServices)
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
