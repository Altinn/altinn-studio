using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;
using Altinn.App.Common.Constants;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.Helpers.Extensions;
using Altinn.App.Common.Models;
using Altinn.App.Common.Serialization;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// The data controller handles creation, update, validation and calculation of data elements.
    /// </summary>
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data")]
    public class DataController : ControllerBase
    {
        private readonly ILogger<DataController> _logger;
        private readonly IData _dataClient;
        private readonly IInstance _instanceClient;
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _appResourcesService;
        private readonly IPrefill _prefillService;

        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// The data controller is responsible for adding business logic to the data elements.
        /// </summary>
        /// <param name="logger">logger</param>
        /// <param name="instanceClient">instance service to store instances</param>
        /// <param name="dataClient">A service with access to data storage.</param>
        /// <param name="altinnApp">The app logic for current service</param>
        /// <param name="appResourcesService">The apps resource service</param>
        /// <param name="prefillService">A service with prefill related logic.</param>
        public DataController(
            ILogger<DataController> logger,
            IInstance instanceClient,
            IData dataClient,
            IAltinnApp altinnApp,
            IAppResources appResourcesService,
            IPrefill prefillService)
        {
            _logger = logger;

            _instanceClient = instanceClient;
            _dataClient = dataClient;
            _altinnApp = altinnApp;
            _appResourcesService = appResourcesService;
            _prefillService = prefillService;
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

            /* The Body of the request is read much later when it has been made sure it is worth it. */

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
                    return BadRequest($"Element type {dataType} not allowed for instance {instanceOwnerPartyId}/{instanceGuid}.");
                }

                if (!IsValidContributer(dataTypeFromMetadata, User))
                {
                    return Forbid();
                }

                bool appLogic = dataTypeFromMetadata.AppLogic != null;

                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound($"Did not find instance {instance}");
                }

                if (!InstanceIsActive(instance))
                {
                    return Conflict($"Cannot upload data for archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}");
                }

                if (appLogic)
                {
                    return await CreateAppModelData(org, app, instance, dataType);
                }
                else
                {
                    if (!CompliesWithDataRestrictions(dataTypeFromMetadata, out string errorMessage))
                    {
                        return BadRequest($"Invalid data provided. Error: {errorMessage}");
                    }

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
        [HttpGet("{dataGuid:guid}")]
        public async Task<ActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
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

                bool? appLogic = RequiresAppLogic(dataType);

                if (appLogic == null)
                {
                    string error = $"Could not determine if {dataType} requires app logic for application {org}/{app}";
                    _logger.LogError(error);
                    return BadRequest(error);
                }
                else if ((bool)appLogic)
                {
                    return await GetFormData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, dataType, instance);
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
        /// <returns>The updated data element, including the changed fields in the event of a calculation that changed data.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("{dataGuid:guid}")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 201)]
        [ProducesResponseType(typeof(CalculationResult), 303)]
        public async Task<ActionResult> Put(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            try
            {
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

                if (!InstanceIsActive(instance))
                {
                    return Conflict($"Cannot update data element of archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}");
                }

                DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                string dataType = dataElement.DataType;

                bool? appLogic = RequiresAppLogic(dataType);

                if (appLogic == null)
                {
                    _logger.LogError($"Could not determine if {dataType} requires app logic for application {org}/{app}");
                    return BadRequest($"Could not determine if data type {dataType} requires application logic.");
                }
                else if ((bool)appLogic)
                {
                    return await PutFormData(org, app, instance, dataGuid, dataType);
                }

                DataType dataTypeFromMetadata = _appResourcesService.GetApplication().DataTypes.FirstOrDefault(e => e.Id.Equals(dataType, StringComparison.InvariantCultureIgnoreCase));
                if (!CompliesWithDataRestrictions(dataTypeFromMetadata, out string errorMessage))
                {
                    return BadRequest($"Invalid data provided. Error: {errorMessage}");
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
                Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
                if (instance == null)
                {
                    return NotFound("Did not find instance");
                }

                if (!InstanceIsActive(instance))
                {
                    return Conflict($"Cannot delete data element of archived or deleted instance {instanceOwnerPartyId}/{instanceGuid}");
                }

                DataElement dataElement = instance.Data.Find(m => m.Id.Equals(dataGuid.ToString()));

                if (dataElement == null)
                {
                    return NotFound("Did not find data element");
                }

                string dataType = dataElement.DataType;

                bool? appLogic = RequiresAppLogic(dataType);

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

            DataElement dataElement = await _dataClient.InsertBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataType, Request);

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
                ModelDeserializer deserializer = new ModelDeserializer(_logger, _altinnApp.GetAppModelType(classRef));
                appModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

                if (!string.IsNullOrEmpty(deserializer.Error))
                {
                    return BadRequest(deserializer.Error);
                }
            }

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType, appModel, null);

            // send events to trigger application business logic
            try
            {
                await _altinnApp.RunDataCreation(instance, appModel, null);
            }
            catch (NotImplementedException)
            {
                // Trigger application business logic the old way. DEPRICATED
                await _altinnApp.RunDataCreation(instance, appModel);
            }

            await UpdatePresentationTextsOnInstance(instance, dataType, appModel);
            await UpdateDataValuesOnInstance(instance, dataType, appModel);

            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            DataElement dataElement = await _dataClient.InsertFormData(appModel, instanceGuid, _altinnApp.GetAppModelType(classRef), org, app, instanceOwnerPartyId, dataType);
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
            Stream dataStream = await _dataClient.GetBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

            if (dataStream != null)
            {
                string userOrgClaim = User.GetOrg();
                if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
                {
                    await _instanceClient.UpdateReadStatus(instanceOwnerPartyId, instanceGuid, "read");
                }

                return File(dataStream, dataElement.ContentType, dataElement.Filename);
            }
            else
            {
                return NotFound();
            }
        }

        private async Task<ActionResult> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            bool successfullyDeleted = await _dataClient.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (successfullyDeleted)
            {
                return Ok();
            }
            else
            {
                return StatusCode(500, $"Something went wrong when deleting data element {dataGuid} for instance {instanceGuid}");
            }
        }

        private bool? RequiresAppLogic(string dataType)
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
        string dataType,
        Instance instance)
        {
            string appModelclassRef = _appResourcesService.GetClassRefForLogicDataType(dataType);

            // Get Form Data from data service. Assumes that the data element is form data.
            object appModel = await _dataClient.GetFormData(
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

            try
            {
                await _altinnApp.RunProcessDataRead(instance, dataGuid, appModel);
            }
            catch (NotImplementedException)
            {
                // Trigger application business logic the old way. DEPRICATED
                await _altinnApp.RunCalculation(appModel);
            }

            string userOrgClaim = User.GetOrg();
            if (userOrgClaim == null || !org.Equals(userOrgClaim, StringComparison.InvariantCultureIgnoreCase))
            {
                await _instanceClient.UpdateReadStatus(instanceOwnerId, instanceGuid, "read");
            }

            return Ok(appModel);
        }

        private async Task<ActionResult> PutBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            DataElement dataElement = await _dataClient.UpdateBinaryData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, Request);
            SelfLinkHelper.SetDataAppSelfLinks(instanceOwnerPartyId, instanceGuid, dataElement, Request);

            return Created(dataElement.SelfLinks.Apps, dataElement);
        }

        private async Task<ActionResult> PutFormData(string org, string app, Instance instance, Guid dataGuid, string dataType)
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            string classRef = _appResourcesService.GetClassRefForLogicDataType(dataType);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            ModelDeserializer deserializer = new ModelDeserializer(_logger, _altinnApp.GetAppModelType(classRef));
            object serviceModel = await deserializer.DeserializeAsync(Request.Body, Request.ContentType);

            if (!string.IsNullOrEmpty(deserializer.Error))
            {
                return BadRequest(deserializer.Error);
            }

            if (serviceModel == null)
            {
                return BadRequest("No data found in content");
            }

            string serviceModelJsonString = JsonSerializer.Serialize(serviceModel);

            bool changedByCalculation = false;
            try
            {
                changedByCalculation = await _altinnApp.RunProcessDataWrite(instance, dataGuid, serviceModel);
            }
            catch (NotImplementedException)
            {
                // Trigger application business logic the old way. DEPRICATED
                 changedByCalculation = await _altinnApp.RunCalculation(serviceModel);
            }

            await UpdatePresentationTextsOnInstance(instance, dataType, serviceModel);
            await UpdateDataValuesOnInstance(instance, dataType, serviceModel);

            // Save Formdata to database
            DataElement updatedDataElement = await _dataClient.UpdateData(
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
                string updatedServiceModelString = JsonSerializer.Serialize(serviceModel);
                CalculationResult calculationResult = new CalculationResult(updatedDataElement);
                try
                {
                    Dictionary<string, object> changedFields = JsonHelper.FindChangedFields(serviceModelJsonString, updatedServiceModelString);
                    calculationResult.ChangedFields = changedFields;
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Unable to determine changed fields");
                }

                return StatusCode((int)HttpStatusCode.SeeOther, calculationResult);
            }

            return Created(dataUrl, updatedDataElement);
        }

        private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, object serviceModel)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                _appResourcesService.GetApplication().PresentationFields,
                instance.PresentationTexts,
                dataType,
                serviceModel);

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdatePresentationTexts(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new PresentationTexts { Texts = updatedValues });
            }
        }

        private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object serviceModel)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                _appResourcesService.GetApplication().DataFields,
                instance.DataValues,
                dataType,
                serviceModel);

            if (updatedValues.Count > 0)
            {
                await _instanceClient.UpdateDataValues(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new DataValues { Values = updatedValues });
            }
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

        private static bool InstanceIsActive(Instance i)
        {
            if (i?.Status?.Archived != null || i?.Status?.SoftDeleted != null || i?.Status?.HardDeleted != null)
            {
                return false;
            }

            return true;
        }

        private static bool IsValidContributer(DataType dataType, ClaimsPrincipal user)
        {
            if (dataType.AllowedContributers == null || dataType.AllowedContributers.Count == 0)
            {
                return true;
            }

            foreach (string item in dataType.AllowedContributers)
            {
                string key = item.Split(':')[0];
                string value = item.Split(':')[1];

                switch (key.ToLower())
                {
                    case "org":
                        if (value.Equals(user.GetOrg(), StringComparison.OrdinalIgnoreCase))
                        {
                            return true;
                        }

                        break;
                    case "orgno":
                        if (value.Equals(user.GetOrgNumber().ToString()))
                        {
                            return true;
                        }

                        break;
                    default:
                        break;
                }
            }

            return false;
        }

        private bool CompliesWithDataRestrictions(DataType dataType, out string errorMessage)
        {
            errorMessage = string.Empty;

            if (!Request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                errorMessage = "The request must include a Content-Disposition header";
                return false;
            }

            ContentDispositionHeaderValue contentDisposition = ContentDispositionHeaderValue.Parse(headerValues);
            string filename = contentDisposition.FileNameStar ?? contentDisposition.FileName;

            if (string.IsNullOrEmpty(filename))
            {
                errorMessage = "The Content-Disposition header must contain a filename";
                return false;
            }

            // We actively remove quotes because we don't want them replaced with '_'.
            // Quotes around filename in Content-Disposition is valid, but not as part of the filename.
            filename = filename.Trim('\"').AsFileName(false);
            string[] splitFilename = filename.Split('.');

            if (splitFilename.Length < 2)
            {
                errorMessage = $"Invalid format for filename: {filename}. Filename is expected to end with '.{{filetype}}'.";
                return false;
            }

            if (dataType.AllowedContentTypes == null || dataType.AllowedContentTypes.Count == 0)
            {
                return true;
            }

            string filetype = splitFilename[splitFilename.Length - 1];
            string mimeType = MimeTypeMap.GetMimeType(filetype);

            if (!Request.Headers.TryGetValue("Content-Type", out StringValues contentType))
            {
                errorMessage = "Content-Type header must be included in request.";
                return false;
            }

            // Verify that file mime type matches content type in request
            if (!contentType.Equals("application/octet-stream") && !mimeType.Equals(contentType, StringComparison.InvariantCultureIgnoreCase))
            {
                errorMessage = $"Content type header {contentType} does not match mime type {mimeType} for uploaded file. Please fix header or upload another file.";
                return false;
            }

            // Verify that file mime type is an allowed content-type
            if (!dataType.AllowedContentTypes.Contains(mimeType, StringComparer.InvariantCultureIgnoreCase) && !dataType.AllowedContentTypes.Contains("application/octet-stream"))
            {
                errorMessage = $"Invalid content type: {mimeType}. Please try another file. Permitted content types include: {string.Join(", ", dataType.AllowedContentTypes)}";
                return false;
            }

            return true;
        }
    }
}
