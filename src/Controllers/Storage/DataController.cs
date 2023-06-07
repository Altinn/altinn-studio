using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;
using LocalTest.Helpers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// api for managing the an instance's data elements
    /// </summary>
    [Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
    [ApiController]
    public class DataController : ControllerBase
    {
        private const long RequestSizeLimit = 2000 * 1024 * 1024;

        private static readonly FormOptions _defaultFormOptions = new FormOptions();

        private readonly IDataRepository _dataRepository;
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;

        private readonly string _storageBaseAndHost;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="dataRepository">the data repository handler</param>
        /// <param name="instanceRepository">the instance repository</param>
        /// <param name="applicationRepository">the application repository</param>
        /// <param name="instanceEventRepository">the instance event repository</param>
        /// <param name="generalSettings">the general settings.</param>
        public DataController(
            IDataRepository dataRepository,
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            IInstanceEventRepository instanceEventRepository,
            IOptions<GeneralSettings> generalSettings)
        {
            _dataRepository = dataRepository;
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
            _instanceEventRepository = instanceEventRepository;
            _storageBaseAndHost = $"{generalSettings.Value.Hostname}/storage/api/v1/";
        }

        /// <summary>
        /// Deletes a specific data element.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to delete.</param>
        /// <param name="delay">A boolean to indicate if the delete should be immediate or delayed following Altinn's business logic</param>
        /// <returns>The metadata of the deleted data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete("data/{dataGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> Delete(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, [FromQuery] bool delay)
        {
            (Instance instance, ActionResult instanceError) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
            if (instance == null)
            {
                return instanceError;
            }

            (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(instanceGuid, dataGuid);
            if (dataElement == null)
            {
                return dataElementError;
            }

            bool appOwnerDeletingElement = User.GetOrg() == instance.Org;

            if (!appOwnerDeletingElement && dataElement.DeleteStatus?.IsHardDeleted == true)
            {
                return NotFound();
            }

            if (delay)
            {
                if (appOwnerDeletingElement && dataElement.DeleteStatus?.IsHardDeleted == true)
                {
                    return dataElement;
                }

                (Application application, ActionResult applicationError) = await GetApplicationAsync(instance.AppId, instance.Org);
                if (application == null)
                {
                    return applicationError;
                }

                DataType dataType = application.DataTypes.FirstOrDefault(dt => dt.Id == dataElement.DataType);

                if (dataType == null || dataType.AppLogic?.AutoDeleteOnProcessEnd != true)
                {
                    return BadRequest($"DataType {dataElement.DataType} does not support delayed deletion");
                }

                return await InitiateDelayedDelete(instance, dataElement);
            }

            return await DeleteImmediately(instance, dataElement);
        }

        /// <summary>
        /// Gets a data file from storage. The content type is the same as the file was stored with.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to retrieve.</param>
        /// <returns>The data file as a stream.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("data/{dataGuid:guid}")]
        [RequestSizeLimit(RequestSizeLimit)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult> Get(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            (Instance instance, ActionResult instanceError) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
            if (instance == null)
            {
                return instanceError;
            }

            (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(instanceGuid, dataGuid);
            if (dataElement == null)
            {
                return dataElementError;
            }

            bool appOwnerRequestingElement = User.GetOrg() == instance.Org;

            if (dataElement.DeleteStatus?.IsHardDeleted == true && !appOwnerRequestingElement)
            {
                return NotFound();
            }

            if (!dataElement.IsRead && !appOwnerRequestingElement)
            {
                dataElement.IsRead = true;
                await _dataRepository.Update(dataElement);
            }

            string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataGuid.ToString());

            if (string.Equals(dataElement.BlobStoragePath, storageFileName))
            {
                Stream dataStream = await _dataRepository.ReadDataFromStorage(instance.Org, storageFileName);

                if (dataStream == null)
                {
                    return NotFound($"Unable to read data element from blob storage for {dataGuid}");
                }

                return File(dataStream, dataElement.ContentType, dataElement.Filename);
            }

            return NotFound("Unable to find requested data item");
        }

        /// <summary>
        /// Returns a list of data elements of an instance.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <returns>The list of data elements</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("dataelements")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElementList>> GetMany(int instanceOwnerPartyId, Guid instanceGuid)
        {
            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            (Instance instance, ActionResult errorResult) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
            if (instance == null)
            {
                return errorResult;
            }

            List<DataElement> dataElements = await _dataRepository.ReadAll(instanceGuid);

            bool appOwnerRequestingElement = User.GetOrg() == instance.Org;

            List<DataElement> filteredList = appOwnerRequestingElement ?
                dataElements :
                dataElements.Where(de => de.DeleteStatus == null || !de.DeleteStatus.IsHardDeleted).ToList();

            DataElementList dataElementList = new DataElementList { DataElements = filteredList };

            return Ok(dataElementList);
        }

        /// <summary>
        /// Create and save the data element. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataType">The data type identifier for the data being uploaded.</param>
        /// <param name="refs">An optional array of data element references.</param>
        /// <param name="generatedFromIds">An optional array of generated from references containing data element ids.</param>
        /// <returns>The metadata of the new data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPost("data")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(RequestSizeLimit)]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> CreateAndUploadData(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string dataType,
            [FromQuery(Name = "refs")] List<Guid> refs = null,
            [FromQuery(Name = "generatedFrom")] List<Guid> generatedFromIds = null)
        {
            if (instanceOwnerPartyId == 0 || string.IsNullOrEmpty(dataType) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, elementType or attached file content cannot be null");
            }

            (Instance instance, ActionResult instanceError) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
            if (instance == null)
            {
                return instanceError;
            }

            (Application appInfo, ActionResult applicationError) = await GetApplicationAsync(instance.AppId, instance.Org);
            if (appInfo == null)
            {
                return applicationError;
            }

            if (!appInfo.DataTypes.Exists(e => e.Id == dataType))
            {
                return BadRequest("Requested element type is not declared in application metadata");
            }

            var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(Request, dataType, refs, generatedFromIds, instance);
            Stream theStream = streamAndDataElement.Stream;
            DataElement newData = streamAndDataElement.DataElement;

            if (theStream == null)
            {
                return BadRequest("No data attachments found");
            }

            newData.Filename = HttpUtility.UrlDecode(newData.Filename);
            newData.Size = await _dataRepository.WriteDataToStorage(instance.Org, theStream, newData.BlobStoragePath);

            if (User.GetOrg() == instance.Org)
            {
                newData.IsRead = false;
            }

            DataElement dataElement = await _dataRepository.Create(newData);
            dataElement.SetPlatformSelfLinks(_storageBaseAndHost, instanceOwnerPartyId);

            await DispatchEvent(InstanceEventType.Created.ToString(), instance, dataElement);

            return Created(dataElement.SelfLinks.Platform, dataElement);
        }

        /// <summary>
        /// Replaces an existing data element whit the attached file. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to replace.</param>
        /// <param name="refs">An optional array of data element references.</param>
        /// <param name="generatedFromIds">An optional array of generated from references containing data element ids.</param>
        /// <returns>The metadata of the updated data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("data/{dataGuid}")]
        [DisableFormValueModelBinding]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> OverwriteData(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            Guid dataGuid,
            [FromQuery(Name = "refs")] List<Guid> refs = null,
            [FromQuery(Name = "generatedFrom")] List<Guid> generatedFromIds = null)
        {
            if (instanceOwnerPartyId == 0 || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, datafile or attached file content cannot be empty");
            }

            (Instance instance, ActionResult instanceError) = await GetInstanceAsync(instanceGuid, instanceOwnerPartyId);
            if (instance == null)
            {
                return instanceError;
            }

            (DataElement dataElement, ActionResult dataElementError) = await GetDataElementAsync(instanceGuid, dataGuid);
            if (dataElement == null)
            {
                return dataElementError;
            }

            if (dataElement.Locked)
            {
                return Conflict($"Data element {dataGuid} is locked and cannot be updated");
            }

            string blobStoragePathName = DataElementHelper.DataFileName(
                instance.AppId,
                instanceGuid.ToString(),
                dataGuid.ToString());

            if (string.Equals(dataElement.BlobStoragePath, blobStoragePathName))
            {
                var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(Request, dataElement.DataType, refs, generatedFromIds, instance);
                Stream theStream = streamAndDataElement.Stream;
                DataElement updatedData = streamAndDataElement.DataElement;

                if (theStream == null)
                {
                    return BadRequest("No data found in request body");
                }

                DateTime changedTime = DateTime.UtcNow;

                dataElement.ContentType = updatedData.ContentType;
                dataElement.Filename = HttpUtility.UrlDecode(updatedData.Filename);
                dataElement.LastChangedBy = User.GetUserOrOrgId();
                dataElement.LastChanged = changedTime;
                dataElement.Refs = updatedData.Refs;

                dataElement.Size = await _dataRepository.WriteDataToStorage(instance.Org, theStream, blobStoragePathName);

                if (User.GetOrg() == instance.Org)
                {
                    dataElement.IsRead = false;
                }

                if (dataElement.Size > 0)
                {
                    DataElement updatedElement = await _dataRepository.Update(dataElement);
                    updatedElement.SetPlatformSelfLinks(_storageBaseAndHost, instanceOwnerPartyId);

                    await DispatchEvent(InstanceEventType.Saved.ToString(), instance, updatedElement);

                    return Ok(updatedElement);
                }

                return UnprocessableEntity("Could not process attached file");
            }

            return StatusCode(500, "Storage url does not match with instance metadata");
        }

        /// <summary>
        /// Replaces the existing metadata for a data element with the new data element.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to update.</param>
        /// <param name="dataElement">The new metadata for the data element.</param>
        /// <returns>The updated data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("dataelements/{dataGuid}")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> Update(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            Guid dataGuid,
            [FromBody] DataElement dataElement)
        {
            if (!instanceGuid.ToString().Equals(dataElement.InstanceGuid) || !dataGuid.ToString().Equals(dataElement.Id))
            {
                return BadRequest("Mismatch between path and dataElement content");
            }

            DataElement updatedDataElement = await _dataRepository.Update(dataElement);

            return Ok(updatedDataElement);
        }

        /// <summary>
        /// Creates a data element by reading the first multipart element or body of the request.
        /// </summary>
        private async Task<(Stream Stream, DataElement DataElement)> ReadRequestAndCreateDataElementAsync(HttpRequest request, string elementType, List<Guid> refs, List<Guid> generatedFromIds, Instance instance)
        {
            DateTime creationTime = DateTime.UtcNow;
            Stream theStream;

            string contentType;
            string contentFileName = null;
            long fileSize = 0;

            if (MultipartRequestHelper.IsMultipartContentType(request.ContentType))
            {
                // Only read the first section of the Multipart message.
                MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
                string boundary = MultipartRequestHelper.GetBoundary(mediaType, _defaultFormOptions.MultipartBoundaryLengthLimit);

                MultipartReader reader = new MultipartReader(boundary, request.Body);
                MultipartSection section = await reader.ReadNextSectionAsync();

                theStream = section.Body;
                contentType = section.ContentType;

                bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out ContentDispositionHeaderValue contentDisposition);

                if (hasContentDisposition)
                {
                    contentFileName = HttpUtility.UrlDecode(contentDisposition.GetFilename());
                    fileSize = contentDisposition.Size ?? 0;
                }
            }
            else
            {
                theStream = request.Body;
                if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
                {
                    bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(headerValues.ToString(), out ContentDispositionHeaderValue contentDisposition);

                    if (hasContentDisposition)
                    {
                        contentFileName = HttpUtility.UrlDecode(contentDisposition.GetFilename());
                        fileSize = contentDisposition.Size ?? 0;
                    }
                }

                contentType = request.ContentType;
            }

            string user = User.GetUserOrOrgId();

            DataElement newData = DataElementHelper.CreateDataElement(elementType, refs, instance, creationTime, contentType, contentFileName, fileSize, user, generatedFromIds);

            return (theStream, newData);
        }

        private async Task<(Application Application, ActionResult ErrorMessage)> GetApplicationAsync(string appId, string org)
        {
            Application application = await _applicationRepository.FindOne(appId, org);

            if (application == null)
            {
                return (null, NotFound($"Cannot find application {appId} in storage"));
            }

            return (application, null);
        }

        private async Task<(Instance Instance, ActionResult ErrorMessage)> GetInstanceAsync(Guid instanceGuid, int instanceOwnerPartyId)
        {
            Instance instance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);

            if (instance == null)
            {
                return (null, NotFound($"Unable to find any instance with id: {instanceOwnerPartyId}/{instanceGuid}."));
            }

            return (instance, null);
        }

        private async Task<(DataElement DataElement, ActionResult ErrorMessage)> GetDataElementAsync(Guid instanceGuid, Guid dataGuid)
        {
            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            if (dataElement == null)
            {
                return (null, NotFound($"Unable to find any data element with id: {dataGuid}."));
            }

            return (dataElement, null);
        }

        private async Task DispatchEvent(string eventType, Instance instance, DataElement dataElement)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                EventType = eventType,
                InstanceId = instance.Id,
                DataId = dataElement.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                User = new PlatformUser
                {
                    UserId = User.GetUserIdAsInt(),
                    AuthenticationLevel = User.GetAuthenticationLevel(),
                    OrgId = User.GetOrg(),
                },
                ProcessInfo = instance.Process,
                Created = DateTime.UtcNow,
            };

            await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
        }

        private async Task<ActionResult<DataElement>> InitiateDelayedDelete(Instance instance, DataElement dataElement)
        {
            DateTime deletedTime = DateTime.UtcNow;

            dataElement.DeleteStatus = new()
            {
                IsHardDeleted = true,
                HardDeleted = deletedTime
            };

            await _dataRepository.Update(dataElement);

            await DispatchEvent(InstanceEventType.Deleted.ToString(), instance, dataElement);
            return Ok(dataElement);
        }

        private async Task<ActionResult<DataElement>> DeleteImmediately(Instance instance, DataElement dataElement)
        {
            string storageFileName = DataElementHelper.DataFileName(instance.AppId, dataElement.InstanceGuid, dataElement.Id);

            await _dataRepository.DeleteDataInStorage(instance.Org, storageFileName);

            await _dataRepository.Delete(dataElement);

            await DispatchEvent(InstanceEventType.Deleted.ToString(), instance, dataElement);

            return Ok(dataElement);
        }
    }
}
