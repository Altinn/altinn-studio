using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
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
        private static readonly FormOptions _defaultFormOptions = new FormOptions();
        private readonly IDataRepository _dataRepository;
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;

        private readonly ILogger _logger;
        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;
        private readonly string _storageBaseAndHost;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="dataRepository">the data repository handler</param>
        /// <param name="instanceRepository">the indtance repository</param>
        /// <param name="applicationRepository">the application repository</param>
        /// <param name="instanceEventRepository">the instance event repository</param>
        /// <param name="generalsettings">the general settings.</param>
        /// <param name="logger">The logger</param>
        public DataController(
            IDataRepository dataRepository,
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            IInstanceEventRepository instanceEventRepository,
            IOptions<GeneralSettings> generalsettings,
            ILogger<DataController> logger)
        {
            _dataRepository = dataRepository;
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
            _instanceEventRepository = instanceEventRepository;
            _logger = logger;
            _storageBaseAndHost = $"{generalsettings.Value.GetHostName}/storage/api/v1/";
        }

        /// <summary>
        /// Deletes a spesific data element.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to delete.</param>
        /// <returns>The metadata of the deleted data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpDelete("data/{dataGuid:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> Delete(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            _logger.LogInformation($"//DataController // Delete // Starting method");

            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to storage service");
            }

            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            if (dataElement == null)
            {
                return NotFound("Provided dataGuid is unknown to storage service");
            }

            try
            {
                string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataGuid.ToString());
                _ = await _dataRepository.DeleteDataInStorage(instance.Org, storageFileName);

                await _dataRepository.Delete(dataElement);

                await DispatchEvent(InstanceEventType.Deleted.ToString(), instance, dataElement);

                return Ok(dataElement);
            }
            catch (Exception deleteException)
            {
                _logger.LogError($"Unable to delete data element {dataGuid} due to {deleteException}");

                return StatusCode(500, $"Unable to delete data element {dataGuid} due to {deleteException.Message}");
            }
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
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult> Get(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            (Instance instance, ActionResult errorResult) = await GetInstanceAsync(instanceId, instanceOwnerPartyId);
            if (instance == null)
            {
                return errorResult;
            }

            string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataGuid.ToString());

            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            if (dataElement != null)
            {
                string orgFromClaim = User.GetOrg();

                if (!string.IsNullOrEmpty(orgFromClaim))
                {
                    _logger.LogInformation($"App owner download of {instance.Id}/data/{dataGuid}, {instance.AppId} for {orgFromClaim}");

                    // update downloaded structure on data element
                    dataElement.AppOwner ??= new ApplicationOwnerDataState();
                    dataElement.AppOwner.Downloaded ??= new List<DateTime>();
                    dataElement.AppOwner.Downloaded.Add(DateTime.UtcNow);

                    await _dataRepository.Update(dataElement);
                }

                if (string.Equals(dataElement.BlobStoragePath, storageFileName))
                {
                    try
                    {
                        Stream dataStream = await _dataRepository.ReadDataFromStorage(instance.Org, storageFileName);

                        if (dataStream == null)
                        {
                            return NotFound($"Unable to read data element from blob storage for {dataGuid}");
                        }

                        return File(dataStream, dataElement.ContentType, dataElement.Filename);
                    }
                    catch (Exception e)
                    {
                        return StatusCode(500, $"Unable to access blob storage for dataelement {e}");
                    }
                }
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
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            (Instance instance, ActionResult errorResult) = await GetInstanceAsync(instanceId, instanceOwnerPartyId);
            if (instance == null)
            {
                return errorResult;
            }

            List<DataElement> dataElements;

            dataElements = await _dataRepository.ReadAll(instanceGuid);

            DataElementList dataElementList = new DataElementList { DataElements = dataElements };

            return Ok(dataElementList);
        }

        /// <summary>
        /// Create and save the data element. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataType">The data type identifier for the data being uploaded.</param>
        /// <param name="refs">An optional array of data element references.</param>
        /// <returns>The metadata of the new data element.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPost("data")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> CreateAndUploadData(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string dataType,
            [FromQuery(Name = "refs")] List<Guid> refs = null)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0 || string.IsNullOrEmpty(dataType) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, elementType or attached file content cannot be null");
            }

            // check if instance exist and user is allowed to change the instance data
            (Instance instance, ActionResult errorMessage) = await GetInstanceAsync(instanceId, instanceOwnerPartyId);
            if (instance == null)
            {
                return errorMessage;
            }

            // check metadata
            (Application appInfo, ActionResult appErrorMessage) = await GetApplicationAsync(instance.AppId, instance.Org);
            if (appInfo == null)
            {
                return appErrorMessage;
            }

            if (!appInfo.DataTypes.Exists(e => e.Id == dataType))
            {
                return BadRequest("Requested element type is not declared in application metadata");
            }

            var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(Request, dataType, refs, instance);
            Stream theStream = streamAndDataElement.Item1;
            DataElement newData = streamAndDataElement.Item2;

            if (theStream == null)
            {
                return BadRequest("No data attachements found");
            }

            try
            {
                newData.Size = await _dataRepository.WriteDataToStorage(instance.Org, theStream, newData.BlobStoragePath);

                DataElement dataElement = await _dataRepository.Create(newData);
                dataElement.SetPlatformSelflink(_storageBaseAndHost, instanceOwnerPartyId);

                await DispatchEvent(InstanceEventType.Created.ToString(), instance, dataElement);

                return Created(dataElement.SelfLinks.Platform, dataElement);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to create instance data in storage: {e}");
            }
        }

        /// <summary>
        /// Replaces an existing data element whit the attached file. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to replace.</param>
        /// <param name="refs">An optional array of data element references.</param>
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
        public async Task<ActionResult<DataElement>> OverwriteData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, [FromQuery(Name = "refs")]List<Guid> refs = null)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0 || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, datafile or attached file content cannot be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            (Instance instance, ActionResult errorMessage) = await GetInstanceAsync(instanceId, instanceOwnerPartyId);
            if (instance == null)
            {
                return errorMessage;
            }

            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            if (dataElement == null)
            {
                return NotFound($"Data guid {dataGuid} is not registered in storage");
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
                var streamAndDataElement = await ReadRequestAndCreateDataElementAsync(Request, dataElement.DataType, refs, instance);
                Stream theStream = streamAndDataElement.Item1;
                DataElement updatedData = streamAndDataElement.Item2;

                if (theStream == null)
                {
                    return BadRequest("No data found in request body");
                }

                DateTime changedTime = DateTime.UtcNow;

                dataElement.ContentType = updatedData.ContentType;
                dataElement.Filename = updatedData.Filename;
                dataElement.LastChangedBy = User.GetUserOrOrgId();
                dataElement.LastChanged = changedTime;
                dataElement.Refs = updatedData.Refs;

                dataElement.Size = await _dataRepository.WriteDataToStorage(instance.Org, theStream, blobStoragePathName);

                if (dataElement.Size > 0)
                {
                    DataElement updatedElement = await _dataRepository.Update(dataElement);
                    updatedElement.SetPlatformSelflink(_storageBaseAndHost, instanceOwnerPartyId);

                    await DispatchEvent(InstanceEventType.Saved.ToString(), instance, updatedElement);

                    return Ok(updatedElement);
                }

                return UnprocessableEntity($"Could not process attached file");
            }

            return StatusCode(500, $"Storage url does not match with instance metadata");
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
            _logger.LogInformation($"update data element for {instanceOwnerPartyId}");

            if (!instanceGuid.ToString().Equals(dataElement.InstanceGuid) || !dataGuid.ToString().Equals(dataElement.Id))
            {
                return BadRequest("Mismatch between path and dataElement content");
            }

            DataElement updatedDataElement = await _dataRepository.Update(dataElement);

            return Ok(updatedDataElement);
        }

        /// <summary>
        /// Updates the data element with a new download confirmed date.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data element is associated with.</param>
        /// <param name="dataGuid">The id of the data element to update.</param>
        /// <returns>The updated data element metadata</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("dataelements/{dataGuid}/confirmDownload")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElement>> ConfirmDownload(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            // check if it has been downloaded
            List<DateTime> downloaded = dataElement.AppOwner?.Downloaded;
            if (downloaded == null || !downloaded.Any())
            {
                return Conflict($"Data element {instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid} is not recorded downloaded by app owner. Please download first.");
            }

            DataElement updatedElement = await SetConfirmedDataAndUpdateDataElement(dataElement, DateTime.UtcNow);

            return Ok(updatedElement);
        }

        /// <summary>
        /// Updates all data elements with confirmed download date.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <param name="instanceGuid">The id of the instance that the data elements are associated with.</param>
        /// <returns>A list of data elements with updated confirmed download dates.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [HttpPut("dataelements/confirmDownload")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Produces("application/json")]
        public async Task<ActionResult<DataElementList>> ConfirmDownloadAll(int instanceOwnerPartyId, Guid instanceGuid)
        {
            List<DataElement> dataElements = await _dataRepository.ReadAll(instanceGuid);

            // check if data has been downloaded
            foreach (DataElement element in dataElements)
            {
                // check if it has been downloaded
                List<DateTime> downloaded = element.AppOwner?.Downloaded;
                if (downloaded == null || downloaded.Count == 0)
                {
                    return Conflict($"Data element {instanceOwnerPartyId}/{instanceGuid}/data/{element.Id} is not recorded downloaded by app owner. Please download first.");
                }
            }

            List<DataElement> resultElements = new List<DataElement>();
            foreach (DataElement element in dataElements)
            {
                DataElement updatedElement = await SetConfirmedDataAndUpdateDataElement(element, DateTime.UtcNow);
                resultElements.Add(updatedElement);
            }

            DataElementList dataElementList = new DataElementList { DataElements = resultElements };

            return Ok(dataElementList);
        }

        private async Task<DataElement> SetConfirmedDataAndUpdateDataElement(DataElement dataElement, DateTime timestamp)
        {
            dataElement.AppOwner ??= new ApplicationOwnerDataState();
            dataElement.AppOwner.DownloadConfirmed ??= new List<DateTime>();
            dataElement.AppOwner.DownloadConfirmed.Add(timestamp);

            DataElement updatedElement = await _dataRepository.Update(dataElement);

            return updatedElement;
        }

        /// <summary>
        /// Creates a data element by reading the first multipart element or body of the request.
        /// </summary>
        private async Task<(Stream, DataElement)> ReadRequestAndCreateDataElementAsync(HttpRequest request, string elementType, List<Guid> refs, Instance instance)
        {
            DateTime creationTime = DateTime.UtcNow;
            Stream theStream = null;

            string contentType = null;
            string contentFileName = null;
            long fileSize = 0;

            if (MultipartRequestHelper.IsMultipartContentType(request.ContentType))
            {
                // Only read the first section of the mulitpart message.
                MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
                string boundary = MultipartRequestHelper.GetBoundary(mediaType, _defaultFormOptions.MultipartBoundaryLengthLimit);

                MultipartSection section = null;

                MultipartReader reader = new MultipartReader(boundary, request.Body);
                section = await reader.ReadNextSectionAsync();

                theStream = section.Body;
                contentType = section.ContentType;

                bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out ContentDispositionHeaderValue contentDisposition);

                if (hasContentDisposition)
                {
                    contentFileName = contentDisposition.FileName.ToString();
                    fileSize = contentDisposition.Size ?? 0;
                }
            }
            else
            {
                theStream = request.Body;
                if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
                {
                    string contentDisposition = headerValues.ToString();
                    List<string> contenDispValues = contentDisposition.Split(';').ToList();

                    string fileNameValue = contenDispValues.FirstOrDefault(x => x.Contains("filename", StringComparison.CurrentCultureIgnoreCase));

                    if (!string.IsNullOrEmpty(fileNameValue))
                    {
                        string[] valueParts = fileNameValue.Split('=');

                        if (valueParts.Count() == 2)
                        {
                            contentFileName = valueParts[1];
                        }
                    }
                }

                contentType = request.ContentType;
            }

            string user = null;

            DataElement newData = DataElementHelper.CreateDataElement(elementType, refs, instance, creationTime, contentType, contentFileName, fileSize, user);

            return (theStream, newData);
        }

        private async Task<(Application, ActionResult)> GetApplicationAsync(string appId, string org)
        {
            ActionResult errorMessage = null;

            try
            {
                Application application = await _applicationRepository.FindOne(appId, org);

                return (application, errorMessage);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    errorMessage = NotFound($"Cannot find application {appId} in storage");
                }
                else
                {
                    errorMessage = StatusCode(500, $"Unable to access document database {dce}");
                }
            }
            catch (Exception e)
            {
                errorMessage = StatusCode(500, $"Unable find application metadata: {e}");
            }

            return (null, errorMessage);
        }

        private async Task<(Instance, ActionResult)> GetInstanceAsync(string instanceId, int instanceOwnerPartyId)
        {
            // check if instance id exist and user is allowed to change the instance data
            Instance instance;
            ActionResult errorMessage = null;

            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

                return (instance, errorMessage);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    errorMessage = NotFound($"Provided instanceId {instanceId} is unknown to platform storage service");
                }
                else
                {
                    errorMessage = StatusCode(500, $"Unable to access document database {dce}");
                }
            }
            catch (Exception e)
            {
                errorMessage = StatusCode(500, $"Unable to get instance {instanceId}: {e}");
            }

            return (null, errorMessage);
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
    }
}
