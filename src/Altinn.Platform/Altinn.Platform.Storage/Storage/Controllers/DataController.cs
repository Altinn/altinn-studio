using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// api for managing the form data element
    /// </summary>
    [Route("storage/api/v1/instances/{instanceId:guid}/[controller]")]
    [ApiController]
    public class DataController : Controller
    {
        private static readonly FormOptions _defaultFormOptions = new FormOptions();

        private readonly IDataRepository _dataRepository;
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="formRepository">the form data repository handler</param>
        /// <param name="instanceRepository">the repository</param>
        public DataController(IDataRepository formRepository, IInstanceRepository instanceRepository)
        {
            _dataRepository = formRepository;
            _instanceRepository = instanceRepository;
        }

        /// <summary>
        /// Deletes a data element.
        /// </summary>
        /// <param name="instanceId">the instance owning the data element</param>
        /// <param name="dataId">the instance of the data element</param>
        /// <param name="instanceOwnerId">the owner of the instance</param>
        /// <returns></returns>
        [HttpDelete("{dataId:guid}")]
        public async Task<IActionResult> Delete(Guid instanceId, Guid dataId, int instanceOwnerId)
        {
            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to storage service");
            }

            string dataIdString = dataId.ToString();

            if (instance.Data.Exists(m => m.Id == dataIdString))
            {
                string storageFileName = DataFileName(instance.ApplicationId, instanceId.ToString(), dataId.ToString());

                bool result = await _dataRepository.DeleteDataInStorage(storageFileName);

                if (result)
                {
                    // Update instance record
                    Data data = instance.Data.Find(m => m.Id == dataIdString);
                    instance.Data.Remove(data);
                    Instance storedInstance = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);

                    return Ok(storedInstance);
                }
            }

            return BadRequest();
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id (an integer)</param>
        /// <param name="instanceId">the instanceId</param>
        /// <param name="dataId">the data id</param>
        /// <returns>The data file as an asyncronous streame</returns>        
        /// <returns>If the request was successful or not</returns>
        // GET /instances/{instanceId}/data/{dataId}
        [HttpGet("{dataId:guid}")]
        public async Task<IActionResult> Get(int instanceOwnerId, Guid instanceId, Guid dataId)
        {
            if (instanceOwnerId == 0 || instanceId == null || dataId == null)
            {
                return BadRequest("Missing parameter values: neither of instanceId, dataId or instanceOwnerId can be empty");
            }

            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId and instanceOwnerId is unknown to platform storage service");
            }

            string storageFileName = DataFileName(instance.ApplicationId, instanceId.ToString(), dataId.ToString());
            string dataIdString = dataId.ToString();

            // check if dataId exists in instance
            if (instance.Data.Exists(m => m.Id == dataIdString))
            {
                Data data = instance.Data.Find(m => m.Id == dataIdString);

                if (string.Equals(data.StorageUrl, storageFileName))
                {
                    Stream dataStream = await _dataRepository.GetDataInStorage(storageFileName);

                    if (dataStream == null)
                    {
                        return NotFound("Unable to read data storage for " + dataIdString);
                    }

                    return File(dataStream, data.ContentType, data.FileName);
                }
            }

            return NotFound("Unable to find requested data item");
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id (an integer)</param>
        /// <param name="instanceId">the instanceId</param>
        /// <returns>The data file as an asyncronous streame</returns>        
        /// <returns>If the request was successful or not</returns>
        // GET /instances/{instanceId}/data/{dataId}
        [HttpGet]
        public async Task<IActionResult> GetMany(int instanceOwnerId, Guid instanceId)
        {
            if (instanceOwnerId == 0 || instanceId == null)
            {
                return BadRequest("Missing parameter values: neither of instanceId, instanceOwnerId can be empty");
            }

            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId and instanceOwnerId is unknown to platform storage service");
            }

            List<Data> dataList = new List<Data>();
            foreach (Data data in instance.Data)
            {
                if (data.FormId != "default")
                {
                    dataList.Add(data);
                }
            }

            return Ok(dataList);
        }

        /// <summary>
        /// Formats a filename for blob storage.
        /// </summary>
        /// <param name="applicationId">the application id</param>
        /// <param name="instanceId">the instance id</param>
        /// <param name="dataId">the data id</param>
        /// <returns></returns>
        public static string DataFileName(string applicationId, string instanceId, string dataId)
        {
            return $"{applicationId}/{instanceId}/data/{dataId}";
        }

        /// <summary>
        /// Create and save the form data
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceId">the instance to update</param>
        /// <param name="formId">the formId to upload data for</param>
        /// <returns>If the request was successful or not</returns>
        // POST /instances/{instanceId}/data?formId={formId}&instanceOwnerId={instanceOwnerId}      
        [HttpPost]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> CreateAndUploadData(int instanceOwnerId, Guid instanceId, string formId)
        {
            if (instanceOwnerId == 0 || instanceId == null || string.IsNullOrEmpty(formId) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceOwnerId, instanceId, formId or file content cannot be null");
            }

            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to platform storage service");
            }

            // check metadata
            ApplicationMetadata appInfo = GetApplicationInformation(instance.ApplicationId);
            if (appInfo == null || !appInfo.Forms.ContainsKey(formId))
            {
                return Forbid("Application information has not registered a form with this formId");
            }

            FormDefinition form = appInfo.Forms[formId];
            DateTime creationTime = DateTime.UtcNow;

            Stream theStream = null;
            string contentType = null;
            string contentFileName = null;
            long fileSize = 0;

            if (MultipartRequestHelper.IsMultipartContentType(Request.ContentType))
            {
                // Only read the first section of the mulitpart message.
                MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(Request.ContentType);
                string boundary = MultipartRequestHelper.GetBoundary(mediaType, _defaultFormOptions.MultipartBoundaryLengthLimit);

                MultipartReader reader = new MultipartReader(boundary, Request.Body);
                MultipartSection section = await reader.ReadNextSectionAsync();

                theStream = section.Body;
                contentType = section.ContentType;

                ContentDispositionHeaderValue contentDisposition;
                bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out contentDisposition);

                if (hasContentDisposition)
                {
                    contentFileName = contentDisposition.FileName.ToString();
                    fileSize = contentDisposition.Size ?? 0;
                }
            }
            else
            {
                theStream = Request.Body;
                contentType = Request.ContentType;
            }

            if (theStream == null)
            {
                return BadRequest("No data attachements found");
            }

            string dataId = Guid.NewGuid().ToString();

            // create new data element, store data in blob
            Data newData = new Data
            {
                // update data record
                Id = dataId,
                FormId = formId,
                ContentType = contentType,
                CreatedBy = User.Identity.Name,
                CreatedDateTime = creationTime,
                FileName = contentFileName ?? $"{dataId}.xml",
                LastChangedBy = User.Identity.Name,
                LastChangedDateTime = creationTime,
                FileSize = fileSize
            };

            string filePath = DataFileName(instance.ApplicationId, instanceId.ToString(), newData.Id.ToString());
            newData.StorageUrl = filePath;

            if (instance.Data == null)
            {
                instance.Data = new List<Data>();
            }

            instance.Data.Add(newData);

            try
            {
                // store file as blob
                await _dataRepository.CreateDataInStorage(theStream, filePath);
            }
            catch (Exception e)
            {
                return StatusCode(500, "Unable to create instance data in storage: " + e.Message);
            }

            try
            {
                // update instance
                Instance result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);

                return Ok(result);
            }
            catch (Exception e)
            {
                return StatusCode(500, "Unable to store instance in storage: " + e.Message);
            }            
        }

        /// <summary>
        /// Update and save data
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="instanceId">the instance to update</param>
        /// <param name="dataId">the dataId to upload data to</param>
        /// <returns>If the request was successful or not</returns>
        // PUT /instances/{instanceId}/data/{dataId}?instanceOwnerId=2339      
        [HttpPut("{dataId}")]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> OverwriteData(int instanceOwnerId, Guid instanceId, Guid dataId)
        {
            if (instanceOwnerId == 0 || dataId == null || instanceId == null || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceOwnerId, instanceId, datafile or attached file content cannot be empty");
            }

            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to platform storage service");
            }

            string dataIdString = dataId.ToString();

            // check that data element exists, if not return not found
            if (instance.Data != null && instance.Data.Exists(m => m.Id == dataIdString))
            {
                Data data = instance.Data.Find(m => m.Id == dataIdString);

                if (data == null)
                {
                    return NotFound("Dataid is not not seen before, try create a new data element");
                }

                string storageFileName = DataFileName(instance.ApplicationId.ToString(), instanceId.ToString(), dataIdString);

                if (string.Equals(data.StorageUrl, storageFileName))
                {
                    DateTime updateTime = DateTime.UtcNow;

                    Stream theStream = null;
                    string contentType = null;
                    string contentFileName = null;

                    if (MultipartRequestHelper.IsMultipartContentType(Request.ContentType))
                    {
                        // Only read the first section of the mulitpart message.
                        MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(Request.ContentType);
                        string boundary = MultipartRequestHelper.GetBoundary(mediaType, _defaultFormOptions.MultipartBoundaryLengthLimit);

                        MultipartReader reader = new MultipartReader(boundary, Request.Body);
                        MultipartSection section = await reader.ReadNextSectionAsync();

                        theStream = section.Body;
                        contentType = section.ContentType;

                        ContentDispositionHeaderValue contentDisposition;
                        bool hasContentDisposition = ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out contentDisposition);

                        if (hasContentDisposition)
                        {
                            contentFileName = contentDisposition.FileName.ToString();
                        }
                    }
                    else
                    {
                        theStream = Request.Body;
                        contentType = Request.ContentType;
                    }

                    if (theStream == null)
                    {
                        return BadRequest("No data attachements found");
                    }

                    DateTime changedTime = DateTime.UtcNow;

                    // update data record
                    data.ContentType = contentType;
                    data.FileName = contentFileName ?? data.FileName;
                    data.LastChangedBy = User.Identity.Name;
                    data.LastChangedDateTime = changedTime;

                    instance.LastChangedDateTime = changedTime;
                    instance.LastChangedBy = 0;

                    // store file as blob                      
                    bool success = await _dataRepository.UpdateDataInStorage(theStream, storageFileName);

                    if (success)
                    {
                        // update instance
                        Instance result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);

                        return Ok(result);
                    }

                    return UnprocessableEntity();                
                }
            }

            return UnprocessableEntity();
        }

        /// <summary>
        /// Delete an instance
        /// </summary>
        /// <param name="instanceId">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="dataId">data id</param>
        /// <returns>updated instance object</returns>
        /// DELETE /instances/{instanceId}/data?instanceOwnerId={instanceOwnerId}&dataId={dataId}
        [HttpDelete("{dataId:guid}")]
        public async Task<ActionResult> Delete(Guid instanceId, int instanceOwnerId, Guid dataId)
        {
            Instance instance = await _instanceRepository.GetOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound($"Didn't find the data object {dataId} that should be deleted in instanceId={instanceId}");
            }
            else
            {
                if (await _dataRepository.DeleteDataInStorage(dataId.ToString()))
                {
                    Data toDeleteData = instance.Data.Find(m => m.Id == dataId.ToString());
                    instance.Data.Remove(toDeleteData);
                    instance = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);
                    return Ok(instance);
                }

                return BadRequest();
            }
        }

        private ApplicationMetadata GetApplicationInformation(string applicationId)
        {
            string json = @"{
                'applicationId': 'KNS/sailor',
                'applicationOwnerId': 'KNS',
                'forms': {
                    'default': {
                        'contentType': 'application/schema+json'
                    },
                    '29fcdbb9-b766-4c92-9d82-59820c61695a': {                        
                    },
                    '769f2780-7c3a-4348-9ac9-c1c85d756c6d': {                        
                    }
                }
                }";

            // dummy data TODO call repository
            return JsonConvert.DeserializeObject<ApplicationMetadata>(json);           
        }
    }
}
