using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Attributes;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.ModelBinding;
using AltinnCore.ServiceLibrary.Api;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// This is the API Controller used for REST
    /// </summary>
    public class ServiceAPIController : Controller
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly ICompilation _compilation;
        private readonly IRepository _repository;
        private readonly IAuthorization _authorization;
        private readonly IRegister _register;
        private readonly ILogger _logger;
        private readonly IForm _form;
        private readonly IInstance _instance;
        private readonly IExecution _execution;
        private readonly IProfile _profile;
        private readonly UserHelper _userHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWorkflow _workflowSI;
        private readonly IPlatformServices _platformSI;
        private readonly IData _data;
        private readonly IInstanceEvent _event;

        private const string FORM_ID = "default";
        private const string VALIDATION_TRIGGER_FIELD = "ValidationTriggerField";

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceAPIController"/> class.
        /// </summary>
        /// <param name="settings">The repository settings (set in Startup.cs).</param>
        /// <param name="generalSettings">The general settings (set in Startup.cs).</param>
        /// <param name="compilationService">The compilation service (set in Startup.cs).</param>
        /// <param name="authorizationService">The authorization service (set in Startup.cs).</param>
        /// <param name="logger">The logger (set in Startup.cs).</param>
        /// <param name="registerService">The register service (set in Startup.cs).</param>
        /// <param name="formService">The form service.</param>
        /// <param name="repositoryService">The repository service (set in Startup.cs).</param>
        /// <param name="executionService">The execution service (set in Startup.cs).</param>
        /// <param name="profileService">The profile service (set in Startup.cs).</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="workflowSI">The workflow service.</param>
        /// <param name="instanceSI">The instance si</param>
        /// <param name="platformSI">The platform si</param>
        /// <param name="data">the data service</param>
        /// <param name="eventSI">the instance event service handler</param>
        public ServiceAPIController(
            IOptions<ServiceRepositorySettings> settings,
            IOptions<GeneralSettings> generalSettings,
            ICompilation compilationService,
            IAuthorization authorizationService,
            ILogger<ServiceAPIController> logger,
            IRegister registerService,
            IForm formService,
            IRepository repositoryService,
            IExecution executionService,
            IProfile profileService,
            IHttpContextAccessor httpContextAccessor,
            IWorkflow workflowSI,
            IInstance instanceSI,
            IPlatformServices platformSI,
            IData data,
            IInstanceEvent eventSI)
        {
            _settings = settings.Value;
            _generalSettings = generalSettings.Value;
            _compilation = compilationService;
            _authorization = authorizationService;
            _logger = logger;
            _register = registerService;
            _form = formService;
            _repository = repositoryService;
            _execution = executionService;
            _profile = profileService;
            _userHelper = new UserHelper(_profile, _register, generalSettings);
            _httpContextAccessor = httpContextAccessor;
            _workflowSI = workflowSI;
            _instance = instanceSI;
            _platformSI = platformSI;
            _data = data;
            _event = eventSI;
        }

        /// <summary>
        /// This method returns the.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="partyId">reportee</param>
        /// <param name="instanceId">The instanceId.</param>
        /// <returns>The Service model as JSON or XML for the given instanceId.</returns>
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> Gindex(string org, string service, int partyId, Guid instanceId)
        {
            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            ViewBag.ServiceContext = serviceContext;
            ViewBag.RequestContext = requestContext;
            ViewBag.Org = org;
            ViewBag.Service = service;
            ViewBag.FormID = instanceId;

            // Assign the RequestContext to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            serviceImplementation.SetPlatformServices(_platformSI);

            ViewBag.PlatformServices = _platformSI;

            Instance instance = await _instance.GetInstance(service, org, requestContext.UserContext.PartyId, instanceId);
            Guid dataId = Guid.Parse(instance.Data.Find(m => m.ElementType.Equals(FORM_ID)).Id);

            // Getting the Form Data from datastore
            object serviceModel = this._data.GetFormData(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.PartyId,
                dataId);

            // Assing the populated service model to the service implementation
            serviceImplementation.SetServiceModel(serviceModel);

            // ServiceEvent 1: HandleGetDataEvent
            // Runs the event where the service developer can implement functionality to retrieve data from internal/external sources
            // based on the data in the service model
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.DataRetrieval);

            // ServiceEvent 2: HandleCalculationEvent
            // Perform Calculation defined by the service developer
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Calculation);

            return Ok(serviceModel);
        }

        /// <summary>
        /// This method handles posts from REST clients
        /// It supports xml or JSON
        /// The binding is handled by a custom Model binder to support that
        /// the Deserialization of the ServiceModel will happen inside the controller.
        /// </summary>
        /// <param name="model">The model as JSON/xml in a string parameter.</param>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="apiMode">The mode that data is submitted.</param>
        /// <returns>The result.</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Index([FromBody] AltinnCoreApiModel model, string org, string service, ApiMode apiMode)
        {
            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();

            ApiResult apiResult = new ApiResult();

            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            serviceImplementation.SetPlatformServices(_platformSI);

            dynamic serviceModel = ParseApiBody(serviceImplementation.GetServiceModelType(), out apiResult, model);
            if (serviceModel == null)
            {
                // The parsing did not create any result
                Response.StatusCode = 403;
                return new ObjectResult(apiResult);
            }

            serviceImplementation.SetServiceModel(serviceModel);

            // ServiceEvent 1: Validate Instansiation. In the service the service developer can add verification to be run at this point
            await serviceImplementation.RunServiceEvent(ServiceEventType.ValidateInstantiation);

            if (!ModelState.IsValid)
            {
                // The validatate instansiation failed
                MapModelStateToApiResult(ModelState, apiResult, serviceContext);
                apiResult.Status = ApiStatusType.Rejected;
                Response.StatusCode = 403;

                return new ObjectResult(apiResult);
            }

            // ServiceEvent 2: HandleGetDataEvent
            // Runs the event where the service developer can implement functionality to retrieve data from internal/external sources
            // based on the data in the service model
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // ServiceEvent 3: HandleCalculationEvent
            // Perform Calculation defined by the service developer
            // Only perform when the mode is to create a new instance or to specific calculate
            if (apiMode.Equals(ApiMode.Calculate) || apiMode.Equals(ApiMode.Create))
            {
                await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

                if (apiMode.Equals(ApiMode.Calculate))
                {
                    // Returns a updated Service model with new calculated data.
                    return Ok(serviceModel);
                }
            }

            // Run the model Validation that handles validation defined on the model
            TryValidateModel(serviceModel);

            // ServiceEvent 4: HandleValidationEvent
            // Perform additional Validation defined by the service developer. Runs when the ApiMode is set to Validate or Complete.
            if (apiMode.Equals(ApiMode.Validate) || apiMode.Equals(ApiMode.Complete))
            {
                await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Validation);
            }

            // If ApiMode is only validate the instance should not be created and only return any validation errors
            if (apiMode.Equals(ApiMode.Validate) || (!ModelState.IsValid && !apiMode.Equals(ApiMode.Create)))
            {
                MapModelStateToApiResult(ModelState, apiResult, serviceContext);

                if (apiResult.Status.Equals(ApiStatusType.ContainsError))
                {
                    if (apiMode.Equals(ApiMode.Validate))
                    {
                        Response.StatusCode = 202;
                    }
                    else
                    {
                        Response.StatusCode = 400;
                    }

                    return new ObjectResult(apiResult);
                }

                return Ok(apiResult);
            }

            Guid instanceId = _execution.GetNewServiceInstanceID();

            // Save Formdata to database
            this._data.InsertData(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.PartyId);

            apiResult.InstanceId = instanceId;
            apiResult.Status = ApiStatusType.Ok;
            return Ok(apiResult);
        }

        /// <summary>
        /// Default action for service api.
        /// </summary>
        /// <param name="model">the api model.</param>
        /// <param name="org">the organisation.</param>
        /// <param name="service">the service.</param>
        /// <param name="instanceId">the instance id.</param>
        /// <param name="apiMode">the mode of the api.</param>
        /// <returns>The api result.</returns>
        [Authorize]
        [HttpPut]
        public async Task<IActionResult> Index([FromBody] AltinnCoreApiModel model, string org, string service, Guid instanceId, ApiMode apiMode)
        {
            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();

            ApiResult apiResult = new ApiResult();

            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;
            if (Request.Headers.Keys.Contains(VALIDATION_TRIGGER_FIELD))
            {
                requestContext.ValidationTriggerField = Request.Headers[VALIDATION_TRIGGER_FIELD];
            }

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Assign the Requestcontext to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            serviceImplementation.SetPlatformServices(_platformSI);

            ViewBag.PlatformServices = _platformSI;

            dynamic serviceModel = ParseApiBody(serviceImplementation.GetServiceModelType(), out apiResult, model);
            if (serviceModel == null)
            {
                // The parsing did not create any result
                Response.StatusCode = 403;
                return new ObjectResult(apiResult);
            }

            serviceImplementation.SetServiceModel(serviceModel);

            // ServiceEvent 2: HandleGetDataEvent
            // Runs the event where the service developer can implement functionality to retrieve data from internal/external sources
            // based on the data in the service model
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);

            // RunService 3: Calcuation
            await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

            // ServiceEvent 3: HandleCalculationEvent
            // Perform Calculation defined by the service developer
            // Only perform when the mode is to create a new instance or to specific calculate
            if (apiMode.Equals(ApiMode.Calculate) || apiMode.Equals(ApiMode.Create))
            {
                if (apiMode.Equals(ApiMode.Calculate))
                {
                    // Returns a updated Service model with new calculated data.
                    return Ok(serviceModel);
                }
            }

            // Run the model Validation that handles validation defined on the model
            TryValidateModel(serviceModel);

            // ServiceEvent 4: HandleValidationEvent
            // Perform additional Validation defined by the service developer. Runs when the ApiMode is set to Validate or Complete.
            if (apiMode.Equals(ApiMode.Validate) || apiMode.Equals(ApiMode.Complete))
            {
                await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Validation);
            }

            // If ApiMode is only validate the instance should not be created and only return any validation errors
            if (apiMode.Equals(ApiMode.Validate) || (!ModelState.IsValid && !apiMode.Equals(ApiMode.Create)))
            {
                MapModelStateToApiResultForClient(ModelState, apiResult, serviceContext);

                if (apiResult.Status.Equals(ApiStatusType.ContainsError))
                {
                    if (apiMode.Equals(ApiMode.Validate))
                    {
                        Response.StatusCode = 202;
                    }
                    else
                    {
                        Response.StatusCode = 400;
                    }

                    return new ObjectResult(apiResult);
                }

                return Ok(apiResult);
            }

            Instance instance = await _instance.GetInstance(service, org, requestContext.UserContext.PartyId, instanceId);
            Guid dataId = Guid.Parse(instance.Data.Find(m => m.ElementType.Equals(FORM_ID)).Id);

            // Save Formdata to database
            this._data.UpdateData(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.PartyId,
                dataId);

            // Create and store instance saved event
            if (apiMode.Equals(ApiMode.Update))
            {
                InstanceEvent instanceEvent = new InstanceEvent
                {
                    AuthenticationLevel = requestContext.UserContext.AuthenticationLevel,
                    EventType = InstanceEventType.Saved.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerId = instance.InstanceOwnerId.ToString(),
                    UserId = requestContext.UserContext.UserId,
                    WorkflowStep = instance.Process.CurrentTask
                };

                await _event.SaveInstanceEvent(instanceEvent, org, service);
            }

            if (apiMode.Equals(ApiMode.Complete))
            {
                ServiceState currentState = _workflowSI.MoveServiceForwardInWorkflow(instanceId, org, service, requestContext.UserContext.PartyId);
                instance.Process = new Storage.Interface.Models.ProcessState()
                {
                    CurrentTask = currentState.State.ToString(),
                    IsComplete = false,
                };

                await _instance.UpdateInstance(instance, service, org, requestContext.UserContext.PartyId, instanceId);

                Response.StatusCode = 200;
                apiResult.InstanceId = instanceId;
                apiResult.Status = ApiStatusType.Ok;
                apiResult.NextStepUrl = _workflowSI.GetUrlForCurrentState(instanceId, org, service, currentState.State);
                apiResult.NextState = currentState.State;
                return new ObjectResult(apiResult);
            }

            apiResult.InstanceId = instanceId;
            apiResult.Status = ApiStatusType.Ok;
            if (!requestContext.RequiresClientSideReleoad)
            {
                return Ok(apiResult);
            }

            {
                Response.StatusCode = 303;
                return new ObjectResult(apiResult);
            }
        }

        /// <summary>
        /// A method to get data for a lookup service that does not require input from user.
        /// </summary>
        /// <param name="reportee">The reportee number (organization number or ssn).</param>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <returns>The lookup result.</returns>
        [Authorize(Policy = "ServiceRead")]
        [HttpGet]
        public async Task<IActionResult> Lookup(string reportee, string org, string service)
        {
            // Load the service implementation for the requested service
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            serviceImplementation.SetPlatformServices(_platformSI);
            ViewBag.PlatformServices = _platformSI;

            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = serviceImplementation.CreateNewServiceModel();
            serviceImplementation.SetServiceModel(serviceModel);

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Run the Data Retriavel event where service developer can potensial load any data without any user input
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.DataRetrieval);

            return Ok(serviceModel);
        }

        /// <summary>
        /// Operation for lookup that posts data to a lookup service that require input.
        /// </summary>
        /// <param name="model">The custom model containing the post body.</param>
        /// <param name="reportee">The reportee number (organization number or ssn).</param>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <returns>The lookup result.</returns>
        [Authorize(Policy = "ServiceRead")]
        [HttpPost]
        public async Task<IActionResult> Lookup([FromBody] AltinnCoreApiModel model, string reportee, string org, string service)
        {
            ApiResult apiResult = new ApiResult();

            // Load the service implementation for the requested service
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service, false);

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service, false);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            serviceImplementation.SetPlatformServices(_platformSI);
            ViewBag.PlatformServices = _platformSI;

            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = null;

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);

            // Do Model Binding and update form data
            serviceModel = ParseApiBody(serviceImplementation.GetServiceModelType(), out apiResult, model);
            if (serviceModel == null)
            {
                Response.StatusCode = 403;
                return new ObjectResult(apiResult);
            }

            serviceImplementation.SetServiceModel(serviceModel);

            // Run the Data Retriavel event where service developer can potensial load any data without any user input
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.DataRetrieval);

            return Ok(serviceModel);
        }

        /// <summary>
        /// Method that maps the MVC Model state to the ApiResult for the client.
        /// </summary>
        /// <param name="modelState">The model state.</param>
        /// <param name="apiResult">The api result.</param>
        /// <param name="serviceContext">The service context.</param>
        private void MapModelStateToApiResultForClient(ModelStateDictionary modelState, ApiResult apiResult, ServiceContext serviceContext)
        {
            apiResult.ValidationResult = new ApiValidationResult
            {
                Messages = new Dictionary<string, ApiValidationMessages>()
            };

            bool containsErrors = false;
            bool containsWarnings = false;
            foreach (string modelKey in modelState.Keys)
            {
                ModelState.TryGetValue(modelKey, out ModelStateEntry entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    foreach (ModelError error in entry.Errors)
                    {
                        if (error.ErrorMessage.StartsWith(_generalSettings.SoftValidationPrefix))
                        {
                            containsWarnings = true;

                            // Remove prefix for soft validation
                            string errorMesssage = error.ErrorMessage.Substring(9);
                            if (apiResult.ValidationResult.Messages.ContainsKey(modelKey))
                            {
                                apiResult.ValidationResult.Messages[modelKey].Warnings.Add(ServiceTextHelper.GetServiceText(errorMesssage, serviceContext.ServiceText, null, "nb-NO"));
                            }
                            else
                            {
                                apiResult.ValidationResult.Messages.Add(modelKey, new ApiValidationMessages
                                {
                                    Errors = new List<string>(),
                                    Warnings = new List<string>
                                    {
                                        ServiceTextHelper.GetServiceText(errorMesssage, serviceContext.ServiceText, null, "nb-NO")
                                    }
                                });
                            }
                        }
                        else
                        {
                            containsErrors = true;
                            if (apiResult.ValidationResult.Messages.ContainsKey(modelKey))
                            {
                                apiResult.ValidationResult.Messages[modelKey].Errors.Add(ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceContext.ServiceText, null, "nb-NO"));
                            }
                            else
                            {
                                apiResult.ValidationResult.Messages.Add(modelKey, new ApiValidationMessages
                                {
                                    Errors = new List<string>
                                    {
                                        ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceContext.ServiceText, null, "nb-NO")
                                    },
                                    Warnings = new List<string>(),
                                });
                            }
                        }
                    }
                }
            }

            if (containsErrors)
            {
                apiResult.Status = ApiStatusType.ContainsError;
            }
            else if (containsWarnings)
            {
                apiResult.Status = ApiStatusType.ContainsWarnings;
            }
        }

        /// <summary>
        /// Method that maps the MVC Model state to the ApiResult.
        /// </summary>
        /// <param name="modelState">The model state.</param>
        /// <param name="apiResult">The api result.</param>
        /// <param name="serviceContext">The service context.</param>
        private void MapModelStateToApiResult(ModelStateDictionary modelState, ApiResult apiResult, ServiceContext serviceContext)
        {
            apiResult.ModelStateEntries = new List<ApiModelStateEntry>();
            foreach (string modelKey in modelState.Keys)
            {
                ApiModelStateEntry apiEntry = null;
                ModelState.TryGetValue(modelKey, out ModelStateEntry entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    apiEntry = new ApiModelStateEntry
                    {
                        Key = modelKey,
                        ValidationState = (ApiModelValidationState)(int)entry.ValidationState,
                        Errors = new List<ApiModelError>(),
                    };
                    foreach (ModelError error in entry.Errors)
                    {
                        apiEntry.Errors.Add(new ApiModelError() { ErrorMessage = ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceContext.ServiceText, null, "nb-NO") });
                    }

                    apiResult.ModelStateEntries.Add(apiEntry);
                    apiResult.Status = ApiStatusType.ContainsError;
                }
            }
        }

        private object ParseApiBody(Type modelType, out ApiResult apiResult, AltinnCoreApiModel model)
        {
            apiResult = new ApiResult();

            object serviceModel = null;

            if (Request.ContentType.Contains("application/json"))
            {
                try
                {
                    serviceModel = JsonConvert.DeserializeObject(model.BodyContent, modelType);
                }
                catch (Exception ex)
                {
                    apiResult.Message = ex.Message;
                    apiResult.Status = ApiStatusType.Rejected;
                    if (ex.InnerException != null)
                    {
                        apiResult.Message += " " + ex.InnerException.Message;
                    }
                }
            }
            else if (Request.ContentType.Contains("application/xml"))
            {
                try
                {
                    using (TextReader sr = new StringReader(model.BodyContent))
                    {
                        XmlSerializer serializer = new XmlSerializer(modelType);
                        serviceModel = serializer.Deserialize(sr);
                    }
                }
                catch (Exception ex)
                {
                    apiResult.Message = ex.Message;
                    apiResult.Status = ApiStatusType.Rejected;
                    if (ex.InnerException != null)
                    {
                        apiResult.Message += " " + ex.InnerException.Message;
                    }
                }
            }

            return serviceModel;
        }

        /// <summary>
        /// Method that gets the current service state
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The form id</param>
        /// <returns>The current state object</returns>
        [HttpGet]
        [Authorize]
        public ServiceState GetCurrentState(string org, string service, int partyId, Guid instanceId)
        {
            return _workflowSI.GetCurrentState(instanceId, org, service, partyId);
        }
    }
}
