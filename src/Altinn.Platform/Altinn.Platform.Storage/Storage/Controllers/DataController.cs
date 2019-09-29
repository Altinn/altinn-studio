namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Net;
    using System.Security.Claims;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using global::Storage.Interface.Models;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Http.Features;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.WebUtilities;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;
    using Microsoft.Net.Http.Headers;

    /// <summary>
    /// api for managing the an instance's data elements
    /// </summary>
    [Route("storage/api/v1/instances/{instanceOwnerId:int}/{instanceGuid:guid}/data")]
    [ApiController]
    public class DataController : ControllerBase
    {
        private static readonly FormOptions _defaultFormOptions = new FormOptions();
        private readonly IDataRepository _dataRepository;
        private readonly IInstanceRepository _instanceRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly ILogger _logger;
        private const long REQUEST_SIZE_LIMIT = 2000 * 1024 * 1024;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="dataRepository">the data repository handler</param>
        /// <param name="instanceRepository">the repository</param>
        /// <param name="applicationRepository">the application repository</param>
        /// <param name="logger">The logger</param>
        public DataController(
            IDataRepository dataRepository,
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            ILogger<DataController> logger)
        {
            _dataRepository = dataRepository;
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
            _logger = logger;
        }

        /// <summary>
        /// Deletes a data element.
        /// </summary>
        /// <param name="instanceGuid">the instance owning the data element</param>
        /// <param name="dataId">the instance of the data element</param>
        /// <param name="instanceOwnerId">the owner of the instance</param>
        /// <returns>the data element</returns>
        [HttpDelete("{dataId:guid}")]
        public async Task<IActionResult> Delete(Guid instanceGuid, Guid dataId, int instanceOwnerId)
        {
            _logger.LogInformation($"//DataController // Delete // Starting method");

            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);
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

                    return Ok(storedInstance);
                }
            }

            return BadRequest();
        }

        /// <summary>
        /// Save the data element
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id (an integer)</param>
        /// <param name="instanceGuid">the instanceId</param>
        /// <param name="dataId">the data id</param>
        /// <returns>The data file as an asyncronous streame</returns>
        /// <returns>If the request was successful or not</returns>
        // GET /instances/{instanceId}/data/{dataId}
        [HttpGet("{dataId:guid}")]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<IActionResult> Get(int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            if (instanceOwnerId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerId, out ActionResult errorResult);
            if (instance == null)
            {
                return errorResult;
            }

            string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataId.ToString());
            string dataIdString = dataId.ToString();

            // check if dataId exists in instance
            if (instance.Data.Exists(element => element.Id == dataIdString))
            {
                DataElement data = instance.Data.Find(element => element.Id == dataIdString);

                if (string.Equals(data.StorageUrl, storageFileName))
                {
                    try
                    {
                        Stream dataStream = await _dataRepository.ReadDataFromStorage(storageFileName);

                        if (dataStream == null)
                        {
                            return NotFound("Unable to read data storage for " + dataIdString);
                        }

                        return File(dataStream, data.ContentType, data.FileName);
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
        /// <param name="instanceOwnerId">the instance owner id (an integer)</param>
        /// <param name="instanceGuid">the guid of the instance</param>
        /// <returns>The list of data elements</returns>
        /// <!-- GET /instances/{instanceId}/data -->
        [HttpGet]
        public async Task<IActionResult> GetMany(int instanceOwnerId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            if (instanceOwnerId == 0)
            {
                return BadRequest("Missing parameter value: instanceOwnerId can not be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerId, out ActionResult errorResult);
            if (instance == null)
            {
                return errorResult;
            }

            List<DataElement> dataList = new List<DataElement>();
            await Task.Run(() =>
                {
                    foreach (DataElement data in instance.Data)
                    {
                        dataList.Add(data);
                    }
                });

            return Ok(dataList);
        }

        /// <summary>
        /// Create and save the data element
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceGuid">the instance to update</param>
        /// <param name="elementType">the element type to upload data for</param>
        /// <returns>If the request was successful or not</returns>
        /// <!-- POST /instances/{instanceOwnerId}/{instanceGuid}/data?elementType={elementType} -->
        [HttpPost]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(REQUEST_SIZE_LIMIT)]
        public async Task<IActionResult> CreateAndUploadData(int instanceOwnerId, Guid instanceGuid, string elementType)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            if (instanceOwnerId == 0 || string.IsNullOrEmpty(elementType) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, elementType or attached file content cannot be null");
            }

            // check if instance exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerId, out ActionResult errorMessage);
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

            if (!appInfo.ElementTypes.Exists(e => e.Id == elementType))
            {
                return BadRequest("Requested element type is not declared in application metadata");
            }

            DataElement newData = GetDataElementFromRequest(Request, elementType, instance, out Stream theStream);

            if (theStream == null)
            {
                return BadRequest("No data attachements found");
            }

            if (instance.Data == null)
            {
                instance.Data = new List<DataElement>();
            }

            instance.Data.Add(newData);

            try
            {
                // store file as blob
                newData.FileSize = await _dataRepository.WriteDataToStorage(theStream, newData.StorageUrl);

                // update instance
                Instance result = await _instanceRepository.Update(instance);
                InstancesController.AddSelfLinks(Request, result);

                return Ok(result);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to create instance data in storage: {e}");
            }
        }

        /// <summary>
        /// Update and save data element.
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceGuid">the instance to update</param>
        /// <param name="dataId">the dataId to upload data to</param>
        /// <returns>If the request was successful or not</returns>
        /// <!-- PUT /instances/{instanceOwnerId}/instanceGuid}/data/{dataId} -->
        [HttpPut("{dataId}")]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> OverwriteData(int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            if (instanceOwnerId == 0 || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, datafile or attached file content cannot be empty");
            }

            // check if instance id exist and user is allowed to change the instance data
            Instance instance = GetInstance(instanceId, instanceOwnerId, out ActionResult errorMessage);
            if (instance == null)
            {
                return errorMessage;
            }

            string dataIdString = dataId.ToString();

            // check that data element exists, if not return not found
            if (instance.Data != null && instance.Data.Exists(m => m.Id == dataIdString))
            {
                DataElement data = instance.Data.Find(m => m.Id == dataIdString);

                if (data == null)
                {
                    return NotFound("Dataid is not registered in instance");
                }

                string storageFileName = DataElementHelper.DataFileName(instance.AppId, instanceGuid.ToString(), dataIdString);

                if (string.Equals(data.StorageUrl, storageFileName))
                {
                    DateTime updateTime = DateTime.UtcNow;

                    DataElement updatedData = GetDataElementFromRequest(Request, data.ElementType, instance, out Stream theStream);

                    if (theStream == null)
                    {
                        return BadRequest("No data attachements found");
                    }

                    DateTime changedTime = DateTime.UtcNow;

                    // update data record
                    data.ContentType = updatedData.ContentType;
                    data.FileName = updatedData.FileName;
                    data.LastChangedBy = User.Identity.Name;
                    data.LastChangedDateTime = changedTime;

                    instance.LastChangedDateTime = changedTime;
                    instance.LastChangedBy = User.Identity.Name;

                    // store file as blob
                    data.FileSize = _dataRepository.WriteDataToStorage(theStream, storageFileName).Result;

                    if (data.FileSize > 0)
                    {
                        // update instance
                        Instance result = await _instanceRepository.Update(instance);
                        InstancesController.AddSelfLinks(Request, instance);

                        return Ok(result);
                    }

                    return UnprocessableEntity($"Could not process attached file");
                }

                return StatusCode(500, $"Storage url does not match with instance metadata");
            }

            return BadRequest("Cannot update data element that is not registered");
        }
        
        /// <summary>
        /// Creates a data element by reading the first multipart element or body of the request.
        /// </summary>
        private DataElement GetDataElementFromRequest(HttpRequest request, string elementType, Instance instance, out Stream theStream)
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

                MultipartReader reader = new MultipartReader(boundary, request.Body);
                MultipartSection section = reader.ReadNextSectionAsync().Result;

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
                contentType = request.ContentType;
            }

            string user = null;

            DataElement newData = DataElementHelper.CreateDataElement(elementType, instance, creationTime, contentType, contentFileName, fileSize, user);

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

        private Instance GetInstance(string instanceId, int instanceOwnerId, out ActionResult errorMessage)
        {
            // check if instance id exist and user is allowed to change the instance data
            Instance instance;
            errorMessage = null;

            try
            {
                instance = _instanceRepository.GetOne(instanceId, instanceOwnerId).Result;

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
    }
}
