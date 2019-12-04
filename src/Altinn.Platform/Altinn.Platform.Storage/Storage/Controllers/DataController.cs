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
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// api for managing the an instance's data elements
    /// </summary>
    [Route("storage/api/v1/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data")]
    [ApiController]
    public class DataController : ControllerBase
    {
        private static readonly FormOptions _defaultFormOptions = new FormOptions();
        private readonly IDataRepository _dataRepository;
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IInstanceEventRepository instanceEventRepository;

        private readonly ILogger _logger;
        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="dataRepository">the data repository handler</param>
        /// <param name="instanceRepository">the indtance repository</param>
        /// <param name="applicationRepository">the application repository</param>
        /// <param name="instanceEventRepository">the instance event repository</param>
        /// <param name="logger">The logger</param>
        public DataController(
            IDataRepository dataRepository,
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            IInstanceEventRepository instanceEventRepository,
            ILogger<DataController> logger)
        {
            _dataRepository = dataRepository;
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
            this.instanceEventRepository = instanceEventRepository;
            _logger = logger;
        }

        /// <summary>
        /// Deletes a data element.
        /// </summary>
        /// <param name="instanceGuid">the instance owning the data element</param>
        /// <param name="dataId">the instance of the data element</param>
        /// <param name="instanceOwnerPartyId">the owner of the instance</param>
        /// <returns>the data element</returns>
        [HttpDelete("{dataId:guid}")]
        public async Task<IActionResult> Delete(Guid instanceGuid, Guid dataId, int instanceOwnerPartyId)
        {
            _logger.LogInformation($"//DataController // Delete // Starting method");

            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to storage service");
            }

            string dataIdString = dataId.ToString();

            if (instance.Data.Exists(m => m.Id == dataIdString))
            {
                string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataId.ToString());
                bool result = await _dataRepository.DeleteDataInStorage(storageFileName);

                if (result)
                {
                    // Update instance record
                    DataElement data = instance.Data.Find(m => m.Id == dataIdString);
                    instance.Data.Remove(data);
                    Instance storedInstance = await _instanceRepository.Update(instance);

                    await DispatchEvent(InstanceEventType.Deleted.ToString(), instance, data);

                    return Ok(storedInstance);
                }
            }

            return BadRequest();
        }

        /// <summary>
        /// Gets a data file from storage. The content type is the same as the file was stored with.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner pq45y id</param>
        /// <param name="instanceGuid">the instanceId</param>
        /// <param name="dataGuid">the data id</param>
        /// <returns>The data file as an asyncronous stream</returns>
        [HttpGet("{dataGuid:guid}")]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(200)]
        public async Task<IActionResult> Get(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerPartyId, out ActionResult errorResult);
            if (instance == null)
            {
                return errorResult;
            }

            string storageFileName =
                DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataGuid.ToString());

            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            // check if dataId exists in instance
            if (dataElement != null)
            {
                if (string.Equals(dataElement.BlobStoragePath, storageFileName))
                {
                    try
                    {
                        Stream dataStream = await _dataRepository.ReadDataFromStorage(storageFileName);

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
        /// <param name="instanceOwnerPartyId">the instance owner id (an integer)</param>
        /// <param name="instanceGuid">the guid of the instance</param>
        /// <returns>The list of data elements</returns>
        /// <!-- GET /instances/{instanceId}/data -->
        [HttpGet]
        [ProducesResponseType(typeof(List<DataElement>), 200)]
        public async Task<IActionResult> GetMany(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerPartyId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerPartyId, out ActionResult errorResult);
            if (instance == null)
            {
                return errorResult;
            }

            List<DataElement> dataList = await _dataRepository.ReadAll(instanceGuid);
            
            return Ok(dataList);
        }

        /// <summary>
        /// Create and save the data element. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner id</param>
        /// <param name="instanceGuid">the instance to update</param>
        /// <param name="dataType">the element type to upload data for</param>
        /// <param name="refs">an optional array of data element references</param>
        /// <returns>If the request was successful or not</returns>
        /// <!-- POST /instances/{instanceOwnerPartyId}/{instanceGuid}/data?elementType={elementType} -->
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        [ProducesResponseType(typeof(DataElement), 201)]
        public async Task<IActionResult> CreateAndUploadData(int instanceOwnerPartyId, Guid instanceGuid, string dataType, [FromQuery(Name ="refs")]List<Guid> refs = null)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0 || string.IsNullOrEmpty(dataType) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, elementType or attached file content cannot be null");
            }

            // check if instance exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerPartyId, out ActionResult errorMessage);
            if (instance == null)
            {
                return errorMessage;
            }

            // check metadata
            Application appInfo = GetApplication(instance.AppId, instance.Org, out ActionResult appErrorMessage);
            if (appInfo == null)
            {
                return appErrorMessage;
            }

            if (!appInfo.DataTypes.Exists(e => e.Id == dataType))
            {
                return BadRequest("Requested element type is not declared in application metadata");
            }

            DataElement newData = ReadRequestAndCreateDataElement(Request, dataType, refs, instance, out Stream theStream);

            if (theStream == null)
            {
                return BadRequest("No data attachements found");
            }

            try
            {
                // store file as blob
                newData.Size = await _dataRepository.WriteDataToStorage(theStream, newData.BlobStoragePath);

                // store data element in repository
                DataElement dataElement = await _dataRepository.Create(newData);
                AddSelfLinks(instance, dataElement);

                await DispatchEvent(InstanceEventType.Created.ToString(), instance, dataElement);

                return Created(dataElement.SelfLinks.Platform, dataElement);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to create instance data in storage: {e}");
            }
        }

        private void AddSelfLinks(Instance instance, DataElement dataElement)
        {
            InstancesController.AddDataSelfLinks(
                                InstancesController.ComputeInstanceSelfLink(Request, instance),
                                dataElement);
        }

        /// <summary>
        /// Replaces an existing data element whit the attached file. The StreamContent.Headers.ContentDisposition.FileName property shall be used to set the filename on client side
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner party id</param>
        /// <param name="instanceGuid">the instance to update</param>
        /// <param name="dataGuid">the dataId to upload data to</param>
        /// <param name="refs">an optional array of data element references</param>
        /// <returns>data element metadata that records the successfull update</returns>
        /// <!-- PUT /instances/{instanceOwnerPartyId}/instanceGuid}/data/{dataId} -->
        [HttpPut("{dataGuid}")]
        [DisableFormValueModelBinding]
        [ProducesResponseType(typeof(DataElement), 200)]
        public async Task<IActionResult> OverwriteData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, [FromQuery(Name = "refs")]List<Guid> refs = null)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            if (instanceOwnerPartyId == 0 || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, datafile or attached file content cannot be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerPartyId, out ActionResult errorMessage);
            if (instance == null)
            {
                return errorMessage;
            }

            DataElement dataElement = await _dataRepository.Read(instanceGuid, dataGuid);

            if (dataElement == null)
            {
                return NotFound($"Dataid {dataGuid} is not registered in storage");
            }

            string blobStoragePathName = DataElementHelper.DataFileName(
                instance.AppId,
                instanceGuid.ToString(),
                dataGuid.ToString());

            if (string.Equals(dataElement.BlobStoragePath, blobStoragePathName))
            {
                DataElement updatedData = ReadRequestAndCreateDataElement(Request, dataElement.DataType, refs, instance, out Stream theStream);

                if (theStream == null)
                {
                    return BadRequest("No data found in request body");
                }

                DateTime changedTime = DateTime.UtcNow;

                // update data record
                dataElement.ContentType = updatedData.ContentType;
                dataElement.Filename = updatedData.Filename;
                dataElement.LastChangedBy = GetUserId();
                dataElement.LastChanged = changedTime;
                dataElement.Refs = updatedData.Refs;

                instance.LastChanged = changedTime;

                instance.LastChangedBy = GetUserId();

                // store file as blob
                dataElement.Size = _dataRepository.WriteDataToStorage(theStream, blobStoragePathName).Result;

                if (dataElement.Size > 0)
                {
                    // update data element
                    // Question: Do we need to update instance?
                    DataElement updatedElement = await _dataRepository.Update(dataElement);
                    AddSelfLinks(instance, dataElement);

                    await DispatchEvent(InstanceEventType.Deleted.ToString(), instance, dataElement);

                    return Ok(dataElement);
                }

                return UnprocessableEntity($"Could not process attached file");
            }

            return StatusCode(500, $"Storage url does not match with instance metadata");            
        }

        /// <summary>
        /// Creates a data element by reading the first multipart element or body of the request.
        /// </summary>
        private DataElement ReadRequestAndCreateDataElement(HttpRequest request, string elementType, List<Guid> refs, Instance instance, out Stream theStream)
        {
            DateTime creationTime = DateTime.UtcNow;

            theStream = null;
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
                section = reader.ReadNextSectionAsync().Result;

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

            return newData;
        }

        private Application GetApplication(string appId, string org, out ActionResult errorMessage)
        {
            errorMessage = null;

            try
            {
                Application application = _applicationRepository.FindOne(appId, org).Result;

                return application;
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

            return null;
        }

        private Instance GetInstance(string instanceId, int instanceOwnerPartyId, out ActionResult errorMessage)
        {
            // check if instance id exist and user is allowed to change the instance data
            Instance instance;
            errorMessage = null;

            try
            {
                instance = _instanceRepository.GetOne(instanceId, instanceOwnerPartyId).Result;

                return instance;
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    errorMessage = NotFound($"Provided instanceId {instanceId} is unknown to platform storage service");
                }

                errorMessage = StatusCode(500, $"Unable to access document database {dce}");
            }
            catch (Exception e)
            {
                errorMessage = StatusCode(500, $"Unable to get instance {instanceId}: {e}");
            }

            return null;
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
                    UserId = GetUserIdAsInt(), // update when authentication is turned on
                    AuthenticationLevel = 0, // update when authentication is turned on
                },                
                ProcessInfo = instance.Process,
                Created = DateTime.UtcNow,
            };

            await instanceEventRepository.InsertInstanceEvent(instanceEvent);
        }

        private string GetUserId()
        {
            return User?.Identity?.Name;
        }

        private int GetUserIdAsInt()
        {
            string userId = User?.Identity?.Name;
            
            if (int.TryParse(userId, out int result))
            {
                return result;
            }

            return 0;
        }
    }
}
