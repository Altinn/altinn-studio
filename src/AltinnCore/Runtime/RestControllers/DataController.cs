using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.Helpers;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Storage.Interface.Enums;
using Storage.Interface.Models;

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
        private readonly IApplication appService;

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
        /// <param name="appService">application service for accessing application metadata.</param>
        public DataController(
            IOptions<GeneralSettings> generalSettings,
            ILogger<DataController> logger,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IExecution executionService,
            IProfile profileService,
            IPlatformServices platformService,
            IApplication appService)
        {
            this.logger = logger;

            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.platformService = platformService;
            this.appService = appService;
            this.userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that this the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="elementType">identifies the data element type to create</param>
        /// <param name="attachmentName">attachment name</param>
        /// <returns>A list is returned if multiple elements are created.</returns>
        [Authorize]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<ActionResult> Create(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string elementType,
            [FromQuery] string attachmentName = "attachment")
        {
            if (string.IsNullOrWhiteSpace(elementType))
            {
                return BadRequest("Element type must be provided.");
            }

            Application application = await appService.GetApplication(org, app);
            if (application == null)
            {
                return NotFound($"AppId {org}/{app} was not found");
            }

            ElementType elementTypeFromMetadata = application.ElementTypes.FirstOrDefault(e => e.Id.Equals(elementType, StringComparison.InvariantCultureIgnoreCase));

            if (elementTypeFromMetadata == null)
            {
                return BadRequest($"Element type {elementType} not allowed for instance {instanceGuid}.");
            }

            bool appLogic = elementTypeFromMetadata.AppLogic;

            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound($"Did not find instance {instance}");
            }

            if (appLogic)
            {
                return await CreateFormData(org, app, instance, elementType);
            }
            else
            {
                return await CreateBinaryData(org, app, instance, elementType, attachmentName);
            }
        }

        /// <summary>
        /// Gets a data element from storage and applies business logic if nessesary.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to get</param>
        /// <returns>The data element is returned in the body of the response</returns>
        [Authorize]
        [HttpGet("{dataGuid:guid?}")]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound($"Did not find instance {instance}");
            }

            DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

            if (dataElement == null)
            {
                return NotFound("Did not find data element");
            }

            string elementType = dataElement.ElementType;

            bool? appLogic = await RequiresAppLogic(org, app, elementType);

            if (appLogic == null)
            {
                string error = $"Could not determine if {elementType} requires app logic for application {org}/{app}";
                logger.LogError(error);
                return BadRequest(error);
            }
            else if ((bool)appLogic)
            {
                return await GetFormData(org, app, instanceOwnerId, instanceGuid, dataGuid, elementType);
            }

            return await GetBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid, dataElement);
        }

        /// <summary>
        ///  Updates an existing data element with new content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>The updated data element.</returns>
        [Authorize]
        [HttpPut("{dataGuid:guid}")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<ActionResult> Put(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Did not find instance");
            }

            DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

            if (dataElement == null)
            {
                return NotFound("Did not find data element");
            }

            string elementType = dataElement.ElementType;

            bool? appLogic = await RequiresAppLogic(org, app, elementType);

            if (appLogic == null)
            {
                logger.LogError($"Could not determine if {elementType} requires app logic for application {org}/{app}");
                return BadRequest($"Could not determine if element type {elementType} requires application logic.");
            }
            else if ((bool)appLogic)
            {
                return await PutFormData(org, app, instance, dataGuid, elementType);
            }

            return await PutBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);
        }

        /// <summary>
        ///  Delete a data element.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>The updated data element.</returns>
        [Authorize]
        [HttpDelete("{dataGuid:guid}")]
        public async Task<ActionResult> Delete(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Did not find instance");
            }

            DataElement dataElement = instance.Data.Find(m => m.Id.Equals(dataGuid.ToString()));

            if (dataElement == null)
            {
                return NotFound("Did not find data element");
            }

            string elementType = dataElement.ElementType;

            bool? appLogic = await RequiresAppLogic(org, app, elementType);

            if (appLogic == null)
            {
                string errorMsg = $"Could not determine if {elementType} requires app logic for application {org}/{app}";
                logger.LogError(errorMsg);
                return BadRequest(errorMsg);
            }
            else if ((bool)appLogic)
            {
                // trying deleting a form element
                return BadRequest("Deleting form data is not possible at this moment.");
            }

            return await DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);
        }

        private async Task<ActionResult> CreateBinaryData(string org, string app, Instance instanceBefore, string elementType, string attachmentName)
        {
            int instanceOwnerId = int.Parse(instanceBefore.Id.Split("/")[0]);
            Guid instanceGuid = Guid.Parse(instanceBefore.Id.Split("/")[1]);

            DataElement dataElement = await dataService.InsertBinaryData(org, app, instanceOwnerId, instanceGuid, elementType, attachmentName, Request);

            if (Guid.Parse(dataElement.Id) == Guid.Empty)
            {
                return StatusCode(500, $"Cannot store form attachment on instance {instanceOwnerId}/{instanceGuid}");
            }

            SelfLinkHelper.SetDataAppSelfLinks(instanceGuid, dataElement, Request);
            return Created(dataElement.StorageUrl, new List<DataElement>() { dataElement });
        }

        private async Task<ActionResult> CreateFormData(
            string org,
            string app,
            Instance instanceBefore,
            string elementType)
        {
            bool startService = true;
            Guid instanceGuid = Guid.Parse(instanceBefore.Id.Split("/")[1]);
            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, elementType, startService);

            object serviceModel;

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

            SelfLinkHelper.SetInstanceAppSelfLinks(instanceBefore, Request);

            Instance instanceAfter = await dataService.InsertFormData(serviceModel, instanceGuid, serviceImplementation.GetServiceModelType(), org, app, int.Parse(instanceBefore.InstanceOwnerId));
            SelfLinkHelper.SetInstanceAppSelfLinks(instanceAfter, Request);
            List<DataElement> createdElements = CompareAndReturnCreatedElements(instanceBefore, instanceAfter);
            string dataUrl = createdElements.First().DataLinks.Apps;

            return Created(dataUrl, createdElements);
        }

        /// <summary>
        /// Gets a data element from storage.
        /// </summary>
        /// <returns>The data element is returned in the body of the response</returns>
        private async Task<ActionResult> GetBinaryData(
            string org,
            string app,
            int instanceOwnerId,
            Guid instanceGuid,
            Guid dataGuid,
            DataElement dataElement)
        {
            Stream dataStream = await dataService.GetBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (dataStream != null)
            {
                return File(dataStream, dataElement.ContentType, dataElement.FileName);
            }
            else
            {
                return NotFound();
            }
        }

        private async Task<ActionResult> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            bool successfullyDeleted = await dataService.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (successfullyDeleted)
            {
                return Ok();
            }
            else
            {
                return StatusCode(500, $"Something went wrong when deleting data element {dataGuid} for instance {instanceGuid}");
            }
        }

        /// <summary>
        /// Prepares the service implementation for a given dataElement, that has an xsd or json-schema.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="elementType">the data element type</param>
        /// <param name="startApp">indicates if the app should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, string elementType, bool startApp = false)
        {
            logger.LogInformation($"Prepare application model for {elementType}");

            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startApp);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            ServiceContext serviceContext = executionService.GetServiceContext(org, app, startApp);

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }

        private object ParseContentAndDeserializeServiceModel(Type modelType, out ActionResult error)
        {
            Stream contentStream = Request.Body;
            string contentType = Request.ContentType;
            error = null;

            object serviceModel = DeserializeModel(contentStream, contentType, modelType, out string errorText);
            if (errorText != null)
            {
                error = BadRequest(errorText);
            }

            return serviceModel;
        }

        /// <summary>
        /// Deserializes a character stream to a model object
        /// </summary>
        /// <returns>the model object</returns>
        public static object DeserializeModel(Stream contentStream, string contentType, Type modelType, out string error)
        {
            object serviceModel = null;
            error = null;

            if (contentStream != null)
            {
                if (contentType.Contains("application/json"))
                {
                    try
                    {
                        StreamReader reader = new StreamReader(contentStream, Encoding.UTF8);
                        string content = reader.ReadToEnd();
                        serviceModel = JsonConvert.DeserializeObject(content, modelType);
                    }
                    catch (Exception ex)
                    {
                        error = $"Cannot parse json content due to {ex.Message}";
                        return null;
                    }
                }
                else if (contentType.Contains("application/xml"))
                {
                    try
                    {
                        XmlSerializer serializer = new XmlSerializer(modelType);
                        serviceModel = serializer.Deserialize(contentStream);
                    }
                    catch (Exception ex)
                    {
                        error = $"Cannot parse xml content due to {ex.Message}";
                        return null;
                    }
                }
            }

            return serviceModel;
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

        private async Task<bool?> RequiresAppLogic(string org, string app, string elementTypeId)
        {
            bool? appLogic = false;

            try
            {
                Application application = await appService.GetApplication(org, app);
                appLogic = application.ElementTypes.Where(e => e.Id == elementTypeId).Select(e => e.AppLogic).First();
            }
            catch (Exception)
            {
                appLogic = null;
            }

            return appLogic;
        }

        /// <summary>
        ///  Gets a data element (form data) from storage and performs business logic on it (e.g. to calculate certain fields) before it is returned.
        ///  If more there are more data elements of the same elementType only the first one is returned. In that case use the more spesific
        ///  GET method to fetch a particular data element.
        /// </summary>
        /// <returns>data element is returned in response body</returns>
        private async Task<ActionResult> GetFormData(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceGuid,
        Guid dataGuid,
        string elementType)
        {
            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, elementType);

            // Get Form Data from data service. Assumes that the data element is form data.
            object serviceModel = dataService.GetFormData(
                instanceGuid,
                serviceImplementation.GetServiceModelType(),
                org,
                app,
                instanceOwnerId,
                dataGuid);

            if (serviceModel == null)
            {
                return BadRequest($"Did not find form data for data element {dataGuid}");
            }

            // Assing the populated service model to the service implementation
            serviceImplementation.SetServiceModel(serviceModel);

            // send events to trigger application business logic
            await serviceImplementation.RunServiceEvent(ServiceEventType.DataRetrieval);
            await serviceImplementation.RunServiceEvent(ServiceEventType.Calculation);

            return Ok(serviceModel);
        }

        private async Task<ActionResult> PutBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            DataElement dataElement = await dataService.UpdateBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid, Request);
            SelfLinkHelper.SetDataAppSelfLinks(instanceGuid, dataElement, Request);

            return Created(dataElement.StorageUrl, new List<DataElement>() { dataElement });
        }

        private async Task<ActionResult> PutFormData(string org, string app, Instance instance, Guid dataGuid, string elementType)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
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
                await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);
            }
            catch (Exception ex)
            {
                logger.LogError($"Validation errors are currently ignored: {ex.Message}");
            }

            // Save Formdata to database
            Instance instanceAfter = await this.dataService.UpdateData(
                serviceModel,
                instanceGuid,
                serviceImplementation.GetServiceModelType(),
                org,
                app,
                int.Parse(instance.InstanceOwnerId),
                dataGuid);

            SelfLinkHelper.SetInstanceAppSelfLinks(instanceAfter, Request);
            DataElement updatedElement = instanceAfter.Data.First(d => d.Id == dataGuid.ToString());
            string dataUrl = updatedElement.DataLinks.Apps;

            return Created(dataUrl, updatedElement);
        }

    }
}
