using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.ModelBinding;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Api;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Workflow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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
        private readonly ICompilation _compilation;
        private readonly IRepository _repository;
        private readonly IAuthorization _authorization;
        private readonly IRegister _register;
        private readonly ILogger _logger;
        private readonly IForm _form;
        private readonly IExecution _execution;
        private readonly IProfile _profile;
        private UserHelper _userHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWorkflowSI _workflowSI;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceAPIController"/> class
        /// </summary>
        /// <param name="settings">The repository settings (set in Startup.cs)</param>
        /// <param name="compilationService">The compilation service (set in Startup.cs)</param>
        /// <param name="authorizationService">The authorization service (set in Startup.cs)</param>
        /// <param name="logger">The logger (set in Startup.cs)</param>
        /// <param name="registerService">The register service (set in Startup.cs)</param>
        /// <param name="formService">The form service</param>
        /// <param name="repositoryService">The repository service (set in Startup.cs)</param>
        /// <param name="executionService">The execution service (set in Startup.cs)</param>
        /// <param name="profileService">The profile service (set in Startup.cs)</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="workflowSI">The workflow service</param>
        public ServiceAPIController(
            IOptions<ServiceRepositorySettings> settings,
            ICompilation compilationService,
            IAuthorization authorizationService,
            ILogger<ServiceAPIController> logger,
            IRegister registerService,
            IForm formService,
            IRepository repositoryService,
            IExecution executionService,
            IProfile profileService,
            IHttpContextAccessor httpContextAccessor,
            IWorkflowSI workflowSI)
        {
            _settings = settings.Value;
            _compilation = compilationService;
            _authorization = authorizationService;
            _logger = logger;
            _register = registerService;
            _form = formService;
            _repository = repositoryService;
            _execution = executionService;
            _profile = profileService;
            _userHelper = new UserHelper(_profile, _register);
            _httpContextAccessor = httpContextAccessor;
            _workflowSI = workflowSI;
        }

        /// <summary>
        /// This method returns the
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="instanceId">The instanceId</param>
        /// <returns>The Service model as JSON or XML for the given instanceId</returns>
        [Authorize(Policy = "ServiceRead")]
        [HttpGet]
        public async Task<IActionResult> Index(string org, string service, int instanceId)
        {
            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, instanceId);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service);

            // Assign data to the ViewBag so it is available to the service views or service implementation
            ViewBag.ServiceContext = serviceContext;
            ViewBag.RequestContext = requestContext;
            ViewBag.Org = org;
            ViewBag.Service = service;
            ViewBag.FormID = instanceId;

            // Assign the RequestContext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            ViewBag.PlatformServices = platformServices;

            // Getting the Form Data from datastore
            object serviceModel = this._form.GetFormModel(
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.ReporteeId,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
        /// <param name="model">The model as JSON/xml in a string parameter</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="apiMode">The mode that data is submitted</param>
        /// <returns>The result</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Index([FromBody] AltinnCoreApiModel model, string org, string service, ApiMode apiMode)
        {
            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();

            ApiResult apiResult = new ApiResult();

            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            ViewBag.PlatformServices = platformServices;

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

            // ServiceEvent 4: HandleValidationEvent
            // Perform additional Validation defined by the service developer.
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Validation);

            // Run the model Validation that handles validation defined on the model
            TryValidateModel(serviceModel);

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

            int instanceId = _execution.GetNewServiceInstanceID(org, service);

            // Save Formdata to database
            this._form.SaveFormModel(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.ReporteeId);

            apiResult.InstanceId = instanceId;
            apiResult.Status = ApiStatusType.Ok;
            return Ok(apiResult);
        }

        /// <summary>
        /// Default action for service api
        /// </summary>
        /// <param name="model">the api model</param>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="instanceId">the instance id</param>
        /// <param name="apiMode">the mode of the api</param>
        /// <returns>The api result</returns>
        [Authorize]
        [HttpPut]
        public async Task<IActionResult> Index([FromBody] AltinnCoreApiModel model, string org, string service, int instanceId, ApiMode apiMode)
        {
            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();

            ApiResult apiResult = new ApiResult();

            // Getting the Service Specific Implementation contained in external DLL migrated from TUL
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Get the serviceContext containing all metadata about current service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service);

            // Assign the Requestcontext and ViewBag to the serviceImplementation so
            // service developer can use the information in any of the service events that is called
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Set the platform services to the ServiceImplementation so the AltinnCore service can take
            // use of the plattform services
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);

            ViewBag.PlatformServices = platformServices;

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

            // ServiceEvent 4: HandleValidationEvent
            // Perform additional Validation defined by the service developer.
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Validation);

            // Run the model Validation that handles validation defined on the model
            TryValidateModel(serviceModel);

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

            // Save Formdata to database
            this._form.SaveFormModel(
                serviceModel,
                instanceId,
                serviceImplementation.GetServiceModelType(),
                org,
                service,
                requestContext.UserContext.ReporteeId);

            if (apiMode.Equals(ApiMode.Complete))
            {
                ServiceState currentState = _workflowSI.MoveServiceForwardInWorkflow(instanceId, org, service, requestContext.UserContext.ReporteeId);
                Response.StatusCode = 200;
                apiResult.InstanceId = instanceId;
                apiResult.Status = ApiStatusType.Ok;
                apiResult.NextStepUrl = _workflowSI.GetUrlForCurrentState(instanceId, org, service, currentState.State);
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
        /// A method to get data for a lookup service that does not require input from user
        /// </summary>
        /// <param name="reportee">The reportee number (organization number or ssn)</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The lookup result</returns>
        [Authorize(Policy = "ServiceRead")]
        [HttpGet]
        public async Task<IActionResult> Lookup(string reportee, string org, string service)
        {
            // Load the service implementation for the requested service
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service);

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);
            ViewBag.PlatformServices = platformServices;

            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = serviceImplementation.CreateNewServiceModel();
            serviceImplementation.SetServiceModel(serviceModel);

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

            // Run the Data Retriavel event where service developer can potensial load any data without any user input
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.DataRetrieval);

            return Ok(serviceModel);
        }

        /// <summary>
        /// Operation for lookup that posts data to a lookup service that require input
        /// </summary>
        /// <param name="model">The custom model containing the post body</param>
        /// <param name="reportee">The reportee number (organization number or ssn)</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The lookup result</returns>
        [Authorize(Policy = "ServiceRead")]
        [HttpPost]
        public async Task<IActionResult> Lookup([FromBody] AltinnCoreApiModel model, string reportee, string org, string service)
        {
            ApiResult apiResult = new ApiResult();

            // Load the service implementation for the requested service
            IServiceImplementation serviceImplementation = _execution.GetServiceImplementation(org, service);

            // Get the service context containing metadata about the service
            ServiceContext serviceContext = _execution.GetServiceContext(org, service);

            // Create and populate the RequestContext object and make it available for the service implementation so
            // service developer can implement logic based on information about the request and the user performing
            // the request
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, 0);
            requestContext.UserContext = _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            // Create platform service and assign to service implementation making it possible for the service implementation
            // to use plattform services. Also make it avaiable in ViewBag so it can be used from Views
            PlatformServices platformServices = new PlatformServices(_authorization, _repository, _execution, org, service);
            serviceImplementation.SetPlatformServices(platformServices);
            ViewBag.PlatformServices = platformServices;

            // Create a new instance of the service model (a Get to lookup will always create a new service model)
            dynamic serviceModel = null;

            // Assign the different context information to the service implementation making it possible for
            // the service developer to take use of this information
            serviceImplementation.SetContext(requestContext, ViewBag, serviceContext, null, ModelState);

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
        /// Method that maps the MVC Model state to the ApiResult
        /// </summary>
        /// <param name="modelState">The model state</param>
        /// <param name="apiResult">The api result</param>
        /// <param name="serviceContext">The service context</param>
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
    }
}
