using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Common.Constants;
using Altinn.App.Common.Enums;
using Altinn.App.Common.Helpers;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// The data controller handles creation, update, validation and calculation of data elements.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data")]
    public class DataController : ControllerBase
    {
        private readonly ILogger<DataController> _logger;
        private readonly IData _dataService;
        private readonly IInstance _instanceService;
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _appResourcesService;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// The data controller is responsible for adding business logic to the data elements.
        /// </summary>
        /// <param name="logger">logger</param>
        /// <param name="instanceService">instance service to store instances</param>
        /// <param name="dataService">dataservice</param>
        /// <param name="altinnApp">The app logic for current service</param>
        /// <param name="appResourcesService">The apps resource service</param>
        public DataController(
            ILogger<DataController> logger,
            IInstance instanceService,
            IData dataService,
            IAltinnApp altinnApp,
            IAppResources appResourcesService)
        {
            _logger = logger;

            _instanceService = instanceService;
            _dataService = dataService;
            _altinnApp = altinnApp;
            _appResourcesService = appResourcesService;
        }

        /// <summary>
        /// Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataType">identifies the data element type to create</param>
        /// <returns>A list is returned if multiple elements are created.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 201)]
        public async Task<ActionResult> Create(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string dataType)
        {
            if (string.IsNullOrWhiteSpace(dataType))
            {
                return BadRequest("Element type must be provided.");
            }

            try
            {
                Application application = _appResourcesService.GetApplication();
                if (application == null)
                {
                    return NotFound($"AppId {org}/{app} was not found");
                }

                DataType dataTypeFromMetadata = application.DataTypes.FirstOrDefault(e => e.Id.Equals(dataType, StringComparison.InvariantCultureIgnoreCase));

                if (dataTypeFromMetadata == null)
                {
                    return BadRequest($"Element type {dataType} not allowed for instance {instanceGuid}.");
                }

                bool appLogic = dataTypeFromMetadata.AppLogic != null;

                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound($"Did not find instance {instance}");
                }

                if (appLogic)
                {
                    return await CreateAppModelData(org, app, instance, dataType);
                }
                else
                {
                    return await CreateBinaryData(org, app, instance, dataType);
                }
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Cannot create data element of {dataType} for {instanceOwnerPartyId}/{instanceGuid}");
            }
        }

        /// <summary>
        /// Gets a data element from storage and applies business logic if nessesary.
        /// </summary>     
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to get</param>
        /// <returns>The data element is returned in the body of the response</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{dataGuid:guid?}")]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            try
            {
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound($"Did not find instance {instance}");
                }

                DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                string dataType = dataElement.DataType;

                bool? appLogic = await RequiresAppLogic(org, app, dataType);

                if (appLogic == null)
                {
                    string error = $"Could not determine if {dataType} requires app logic for application {org}/{app}";
                    _logger.LogError(error);
                    return BadRequest(error);
                }
                else if ((bool)appLogic)
                {
                    return await GetFormData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, dataType);
                }

                return await GetBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, dataElement);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Cannot get data element of {dataGuid} for {instanceOwnerPartyId}/{instanceGuid}");
            }
        }

        /// <summary>
        ///  Updates an existing data element with new content.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>The updated data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("{dataGuid:guid}")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 201)]
        public async Task<ActionResult> Put(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            try
            {
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                string dataType = dataElement.DataType;

                bool? appLogic = await RequiresAppLogic(org, app, dataType);

                if (appLogic == null)
                {
                    _logger.LogError($"Could not determine if {dataType} requires app logic for application {org}/{app}");
                    return BadRequest($"Could not determine if data type {dataType} requires application logic.");
                }
                else if ((bool)appLogic)
                {
                    return await PutFormData(org, app, instance, dataGuid, dataType);
                }

                return await PutBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Unable to update data element {dataGuid} for instance {instanceOwnerPartyId}/{instanceGuid}");
            }
        }

        /// <summary>
        ///  Delete a data element.
        /// </summary>
        /// <param name="org">unique identfier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
        /// <param name="instanceGuid">unique id to identify the instance</param>
        /// <param name="dataGuid">unique id to identify the data element to update</param>
        /// <returns>The updated data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete("{dataGuid:guid}")]
        public async Task<ActionResult> Delete(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            try
            {
                Instance instance = await _instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound("Did not find instance");
                }

                DataElement dataElement = instance.Data.Find(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                string dataType = dataElement.DataType;

                bool? appLogic = await RequiresAppLogic(org, app, dataType);

                if (appLogic == null)
                {
                    string errorMsg = $"Could not determine if {dataType} requires app logic for application {org}/{app}";
                    _logger.LogError(errorMsg);
                    return BadRequest(errorMsg);
                }
                else if ((bool)appLogic)
                {
                    // trying deleting a form element
                    return BadRequest("Deleting form data is not possible at this moment.");
                }

                return await DeleteBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e, $"Cannot delete data element {dataGuid} for {instanceOwnerPartyId}/{instanceGuid}");
            }
        }

        private ActionResult ExceptionResponse(Exception exception, string message)
        {
            _logger.LogError($"{message}: {exception}");

            if (exception is PlatformHttpException)
            {
                PlatformHttpException phe = exception as PlatformHttpException;
                return StatusCode((int)phe.Response.StatusCode, phe.Message);
            }
            else if (exception is ServiceException)
            {
                ServiceException se = exception as ServiceException;
                return StatusCode((int)se.StatusCode, se.Message);
            }

            return StatusCode(500, $"{message}");
        }

        private async Task<ActionResult> CreateBinaryData(string org, string app, Instance instanceBefore, string dataType)
        {
            int instanceOwnerPartyId = int.Parse(instanceBefore.Id.Split("/")[0]);
            Guid instanceGuid = Guid.Parse(instanceBefore.Id.Split("/")[1]);

            DataElement dataElement = await _dataService.InsertBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataType, Request);

            if (Guid.Parse(dataElement.Id) == Guid.Empty)
            {
                return StatusCode(500, $"Cannot store form attachment on instance {instanceOwnerPartyId}/{instanceGuid}");
            }

            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);
            return Created(dataElement.SelfLinks.Apps, dataElement);
        }

        private async Task<ActionResult> CreateAppModelData(
            string org,
            string app,
            Instance instance,
            string dataType)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            object appModel;

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            if (Request.ContentType == null)
            {
                appModel = _altinnApp.CreateNewAppModel(classRef);
            }
            else
            {
                appModel = ParseContentAndDeserializeServiceModel(_altinnApp.GetAppModelType(classRef), out ActionResult contentError);
                if (contentError != null)
                {
                    return contentError;
                }
            }

            // send events to trigger application business logic
            await _altinnApp.RunDataCreation(instance, appModel);

            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            DataElement dataElement = await _dataService.InsertFormData(appModel, instanceGuid, _altinnApp.GetAppModelType(classRef), org, app, instanceOwnerPartyId, dataType);
            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

            return Created(dataElement.SelfLinks.Apps, dataElement);
        }


        /// <summary>
        /// Gets a data element from storage.
        /// </summary>
        /// <returns>The data element is returned in the body of the response</returns>
        private async Task<ActionResult> GetBinaryData(
            string org,
            string app,
            int instanceOwnerPartyId,
            Guid instanceGuid,
            Guid dataGuid,
            DataElement dataElement)
        {
            Stream dataStream = await _dataService.GetBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

            if (dataStream != null)
            {
                return File(dataStream, dataElement.ContentType, dataElement.Filename);
            }
            else
            {
                return NotFound();
            }
        }

        private async Task<ActionResult> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            bool successfullyDeleted = await _dataService.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (successfullyDeleted)
            {
                return Ok();
            }
            else
            {
                return StatusCode(500, $"Something went wrong when deleting data element {dataGuid} for instance {instanceGuid}");
            }
        }

        private object ParseContentAndDeserializeServiceModel(Type modelType, out ActionResult error)
        {
            error = null;
            object obj = ParseFormDataAndDeserialize(modelType, Request.ContentType, Request.Body, out string errorText);

            if (!string.IsNullOrEmpty(errorText))
            {
                error = BadRequest(errorText);

                return null;
            }

            return obj;
        }

        public static object ParseFormDataAndDeserialize(Type modelType, string contentType, Stream contentStream, out string error)
        {
            error = null;
            object serviceModel = null;

            if (contentStream != null)
            {
                if (contentType.Contains("application/json"))
                {
                    try
                    {
                        using StreamReader reader = new StreamReader(contentStream, Encoding.UTF8);
                        string content = reader.ReadToEndAsync().Result;
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
                        error = $"Cannot parse xml content: {ex.Message}, {ex.InnerException}";
                        return null;
                    }
                }
                else
                {
                    error = $"Unknown content type {contentType}. Cannot read form data.";
                    return null;
                }
            }

            return serviceModel;
        }

        private async Task<bool?> RequiresAppLogic(string org, string app, string dataType)
        {
            bool? appLogic = false;

            try
            {
                Application application = _appResourcesService.GetApplication();
                appLogic = application.DataTypes.Where(e => e.Id == dataType).Select(e => e.AppLogic != null).First();
            }
            catch (Exception)
            {
                appLogic = null;
            }

            return appLogic;
        }

        /// <summary>
        ///  Gets a data element (form data) from storage and performs business logic on it (e.g. to calculate certain fields) before it is returned.
        ///  If more there are more data elements of the same dataType only the first one is returned. In that case use the more spesific
        ///  GET method to fetch a particular data element. 
        /// </summary>
        /// <returns>data element is returned in response body</returns>
        private async Task<ActionResult> GetFormData(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceGuid,
        Guid dataGuid,
        string dataType)
        {

            string appModelclassRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            // Get Form Data from data service. Assumes that the data element is form data.
            object appModel = await _dataService.GetFormData(
                instanceGuid,
                _altinnApp.GetAppModelType(appModelclassRef),
                org,
                app,
                instanceOwnerId,
                dataGuid);

            if (appModel == null)
            {
                return BadRequest($"Did not find form data for data element {dataGuid}");
            }


            // Trigger application business logic
            await _altinnApp.RunCalculation(appModel);

            return Ok(appModel);
        }

        private async Task<ActionResult> PutBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            DataElement dataElement = await _dataService.UpdateBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, Request);
            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

            return Created(dataElement.SelfLinks.Apps, dataElement);
        }

        private async Task<ActionResult> PutFormData(string org, string app, Instance instance, Guid dataGuid, string dataType)
        {
            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            object serviceModel = ParseContentAndDeserializeServiceModel(_altinnApp.GetAppModelType(classRef), out ActionResult contentError);

            if (contentError != null)
            {
                return contentError;
            }

            if (serviceModel == null)
            {
                return BadRequest("No data found in content");
            }

            // Trigger application business logic
            bool changedByCalculation = await _altinnApp.RunCalculation(serviceModel);

            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            // Save Formdata to database
            DataElement updatedDataElement = await _dataService.UpdateData(
                serviceModel,
                instanceGuid,
                _altinnApp.GetAppModelType(classRef),
                org,
                app,
                instanceOwnerPartyId,
                dataGuid);

            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, updatedDataElement, Request);

            string dataUrl = updatedDataElement.SelfLinks.Apps;

            if (changedByCalculation)
            {
                return StatusCode((int)HttpStatusCode.SeeOther, updatedDataElement);
            }

            return Created(dataUrl, updatedDataElement);
        }

        private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
        {
            if (e.Response.StatusCode == HttpStatusCode.Forbidden)
            {
                return Forbid();
            }
            else if (e.Response.StatusCode == HttpStatusCode.NotFound)
            {
                return NotFound();
            }
            else if (e.Response.StatusCode == HttpStatusCode.Conflict)
            {
                return Conflict();
            }
            else
            {
                return ExceptionResponse(e, defaultMessage);
            }
        }
    }
}
