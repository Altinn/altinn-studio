using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;
using Storage.Interface.Enums;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// The data controller handles creation, update, validation and calculation of data elements.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/data")]
    public class DataController : ControllerBase
    {
        private readonly ILogger<DataController> logger;
        private readonly IData dataService;
        private readonly IInstance instanceService;

        private readonly IExecution executionService;
        private readonly UserHelper userHelper;
        private readonly IPlatformServices platformService;
        private readonly IRepository repositoryService;
        private readonly IInstanceEvent eventService;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// The data controller is responsible for adding business logic to the data elements.
        /// </summary>
        /// <param name="generalSettings">settings </param>
        /// <param name="logger">logger</param>
        /// <param name="registerService">register service</param>
        /// <param name="instanceService">instance service to store instances</param>
        /// <param name="dataService">dataservice</param>
        /// <param name="executionService">execution service to execute data element logic</param>
        /// <param name="profileService">profile service to access profile information about users and parties</param>
        /// <param name="platformService">platform</param>
        /// <param name="repositoryService">repository for accessing applicaiton metadata</param>
        /// <param name="eventService">event service for dispatching data events</param>
        public DataController(
            IOptions<GeneralSettings> generalSettings,
            ILogger<DataController> logger,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IExecution executionService,
            IProfile profileService,
            IPlatformServices platformService,
            IRepository repositoryService,
            IInstanceEvent eventService)
        {
            this.logger = logger;

            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.platformService = platformService;
            this.repositoryService = repositoryService;
            this.eventService = eventService;
            this.userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        ///  Gets a data element (form data) from storage and performs business logic on it (e.g. to calculate certain fields) before it is returned.
        ///  If more there are more data elements of the same elementType only the first one is returned. In that case use the more spesific
        ///  GET method to fetch a particular data element. 
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is this the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="elementType">identifies the type of the data element that should be returned</param>
        /// <returns>data element is returned in response body</returns>
        [Authorize]
        [HttpGet("{elementType}")]
        public async Task<ActionResult> GetDataElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] string elementType = "default")
        {
            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, elementType);

            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Did not find instance");
            }

            // Assume that there is only one data element of a given type !!
            DataElement dataElement = instance.Data.Find(m => m.ElementType.Equals(elementType));

            if (dataElement == null)
            {
                return NotFound("Did not find data element");
            }            

            Guid dataId = Guid.Parse(dataElement.Id);

            // Get Form Data from data service. Assumes that the data element is form data.
            object serviceModel = dataService.GetFormData(
                instanceGuid,
                serviceImplementation.GetServiceModelType(),
                org,
                app,
                instanceOwnerId,
                dataId);

            if (serviceModel == null)
            {
                return BadRequest($"Did not find form data for data element {dataId}");
            }

            // Assing the populated service model to the service implementation
            serviceImplementation.SetServiceModel(serviceModel);

            // send events to trigger application business logic
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.DataRetrieval);
            await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Calculation);

            return Ok(serviceModel);
        }

        /// <summary>
        /// Gets a data element directly from storage without applying business logic.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to get</param>
        /// <returns>The data element is returned in the body of the response</returns>
        [HttpGet("{dataGuid:guid}")]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

            DataElement dataElement = instance.Data.Find(d => d.Id == dataGuid.ToString());

            Stream dataStream = await dataService.GetData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (dataStream != null)
            {
                return File(dataStream, dataElement.ContentType, dataElement.FileName);
            }
            else
            {
                return NotFound();
            }
        }

        /// <summary>
        ///  Updates an existing data element with new content.
        ///  Content (xml/json) is expected to be passed as the body of the request.
        ///  Before the data element is stored application business logic is applied, e.g. calculation.
        ///  Thus the data element may be changed and is therefore returned by the controller.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>changed data element with calculated fields in the body of the response message</returns>
        [HttpPut("{dataGuid:guid}")]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [DisableFormValueModelBinding]
        public async Task<ActionResult> PutDataElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {           
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

            if (instance == null)
            {
                return NotFound("Instance not found");
            }

            DataElement dataElement = instance.Data.Find(m => m.Id == dataGuid.ToString());

            if (dataElement == null)
            {
                return NotFound("Data element not found");
            }

            string elementType = dataElement.ElementType;
            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, elementType);

            object serviceModel = ParseContentAndDeserializeServiceModel(serviceImplementation.GetServiceModelType(), out ActionResult contentError);

            if (contentError != null)
            {
                return contentError;
            }

            if (serviceModel == null)
            {
                return BadRequest("No data found in content");
            }

            serviceImplementation.SetServiceModel(serviceModel);

            // send events to trigger application business logic
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);
            await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

            try
            {
                // Run the model Validation that handles validation defined on the model
                TryValidateModel(serviceModel);

                // send events to trigger application business logic
                await serviceImplementation.RunServiceEvent(AltinnCore.ServiceLibrary.Enums.ServiceEventType.Validation);
            }
            catch (Exception ex)
            {
                logger.LogError($"Validation errors are currently ignored: {ex.Message}");
            }

            // Save Formdata to database
            this.dataService.UpdateData(
                serviceModel,
                instanceGuid,
                serviceImplementation.GetServiceModelType(),
                org,
                app,
                instanceOwnerId,
                dataGuid);

            // Create and store instance saved event
            await DispatchEvent(InstanceEventType.Saved.ToString(), instance, dataGuid);

            return Ok(serviceModel);
        }       

        /// <summary>
        /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that this the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="elementType">identifies the data element type to create</param>
        /// <returns>instance metadata with new data element</returns>
        [Authorize]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<ActionResult> CreateDataElement(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementType = "default")
        {
            bool startService = true;

            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, elementType, startService);
                
            Application application = repositoryService.GetApplication(org, app);
            if (application != null)
            {
                return NotFound($"AppId {org}/{app} was not found");
            }

            Instance instanceBefore = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instanceBefore == null)
            {
                return BadRequest("Unknown instance");
            }       

            object serviceModel = null;

            if (Request.ContentType == null)
            {
               serviceModel = serviceImplementation.CreateNewServiceModel();
            }
            else
            {
                serviceModel = ParseContentAndDeserializeServiceModel(serviceImplementation.GetServiceModelType(), out ActionResult contentError);
                if (contentError != null)
                {
                    return contentError;
                }
            }

            serviceImplementation.SetServiceModel(serviceModel);

            // send events to trigger application business logic
            await serviceImplementation.RunServiceEvent(ServiceEventType.Instantiation);
            await serviceImplementation.RunServiceEvent(ServiceEventType.ValidateInstantiation);

            InstancesController.SetAppSelfLinks(instanceBefore, Request);
           
            Instance instanceAfter = await dataService.InsertData(serviceModel, instanceGuid, serviceImplementation.GetServiceModelType(), org, app, instanceOwnerId);

            InstancesController.SetAppSelfLinks(instanceAfter, Request);
            List<DataElement> createdElements = CompareAndReturnCreatedElements(instanceBefore, instanceAfter);           
            string dataUrl = createdElements.First().DataLinks.Apps;

            return Created(dataUrl, instanceAfter);
        }

        /// <summary>
        /// Prepares the service implementation for a given dataElement, that has an xsd or json-schema.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="elementType">the data element type</param>
        /// <param name="startService">indicates if the servcie should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, string elementType, bool startService = false)
        {
            logger.LogInformation($"Prepare application model for {elementType}");

            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startService);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            ServiceContext serviceContext = executionService.GetServiceContext(org, app, startService);

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }

        private object ParseContentAndDeserializeServiceModel(Type modelType, out ActionResult error)
        {
            error = null;
            object serviceModel = null;

            Stream contentStream = Request.Body;
            if (contentStream != null)
            {
                if (Request.ContentType.Contains("application/json"))
                {
                    try
                    {
                        StreamReader reader = new StreamReader(contentStream, Encoding.UTF8);
                        string content = reader.ReadToEnd();
                        serviceModel = JsonConvert.DeserializeObject(content, modelType);
                    }
                    catch (Exception ex)
                    {
                        error = BadRequest($"Cannot parse json content due to {ex.Message}");
                        return null;
                    }
                }
                else if (Request.ContentType.Contains("application/xml"))
                {
                    try
                    {
                        XmlSerializer serializer = new XmlSerializer(modelType);
                        serviceModel = serializer.Deserialize(contentStream);
                    }
                    catch (Exception ex)
                    {
                        error = BadRequest($"Cannot parse xml content due to {ex.Message}");
                        return null;
                    }
                }
            }

            return serviceModel;
        }

        private async Task DispatchEvent(string eventType, Instance instance, Guid dataGuid)
        {
            UserContext userContext = await userHelper.GetUserContext(HttpContext);

            string workflowStep = instance.Process?.CurrentTask;

            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;

            InstanceEvent instanceEvent = new InstanceEvent
            {
                AuthenticationLevel = userContext.AuthenticationLevel,
                EventType = eventType,
                DataId = dataGuid.ToString(),
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                UserId = userContext.UserId,
                WorkflowStep = workflowStep,
            };

            await eventService.SaveInstanceEvent(instanceEvent, org, app);
        }

        private List<DataElement> CompareAndReturnCreatedElements(Instance before, Instance after)
        {
            if (before.Data == null)
            {
                return after.Data;
            }

            HashSet<string> dataGuidsBefore = before.Data.Select(d => d.Id).ToHashSet();
            HashSet<string> dataGuidsAfter = after.Data.Select(d => d.Id).ToHashSet();

            IEnumerable<string> dataGuidsCreated = dataGuidsAfter.Except(dataGuidsBefore);

            List<DataElement> elementsCreated = new List<DataElement>();

            foreach (string guid in dataGuidsCreated)
            {
                elementsCreated.Add(after.Data.Find(d => d.Id == guid));
            }

            return elementsCreated;
        }
    }
}
