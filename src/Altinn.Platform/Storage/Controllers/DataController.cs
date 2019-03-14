using System;
using System.Collections.Generic;
using System.IO;
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
    /// api for managing the form data
    /// </summary>
    [Route("api/v1/instances/{instanceId:guid}/[controller]")]
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
        public DataController(IDataRepository formRepository, IInstanceRepository instanceRepository)
        {
            _dataRepository = formRepository;
            _instanceRepository = instanceRepository;
        }

        /// <summary>
        /// Default test api
        /// </summary>
        /// <returns>The test return values</returns>
        // GET dataservice/instances/{instanceId}/forms
        [HttpGet]
        public ActionResult<IEnumerable<string>> Get()
        {
            return new string[] { "value1", "value2" };
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="fileName">the file name for for form data</param>
        /// <returns>The get response</returns>        
        /// <returns>If the request was successful or not</returns>
        // POST dataservice/instances/{instanceId}/forms/{fileName}/
        [HttpGet("{fileName}")]
        public async Task<ActionResult> Get(string fileName)
        {
            if (string.IsNullOrEmpty(fileName))
            {
                return BadRequest();
            }
          
            var result = await _dataRepository.GetDataInStorage(fileName);

            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="instanceId">the instance to update</param>
        /// <param name="formId">the formId to upload data for</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <returns>If the request was successful or not</returns>
        // POST /instances/{instanceId}/data/{formId}        
        [HttpPost("{formId}")]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> UploadData(Guid instanceId, string formId, string instanceOwnerId)
        {      
            if (instanceId == null || string.IsNullOrEmpty(formId) || Request.Body == null)
            {
                return BadRequest("Missing parameter values: instanceId, formId or file content cannot be null");
            }

            // check if instance id exist and user is allowed to change the instance data            
            Instance instance = await _instanceRepository.ReadOneAsync(instanceId, instanceOwnerId);
            if (instance == null)
            {
                return NotFound("Provided instanceId is unknown to platform storage service");              
            }

            // check if data element exists, if so raise exception
            if (instance.Data != null && instance.Data.ContainsKey(formId))
            {
                return Forbid("Data element allready exists, try Put instead of Post");
            }

            // check metadata
            ApplicationInformation appInfo = GetApplicationInformation(instance.ApplicationId);
            if (appInfo == null || !appInfo.Forms.ContainsKey(formId))
            {
                return Forbid("Application information has not registered a form with this formId");
            }

            FormDefinition form = appInfo.Forms[formId];
            DateTime creationTime = DateTime.UtcNow;

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

            // create new data element, store data in blob
            Data newData = new Data
            {
                // update data record
                Id = Guid.NewGuid().ToString(),
                ContentType = contentType,
                CreatedBy = User.Identity.Name,
                CreatedDateTime = creationTime,
                FileName = contentFileName,
                LastChangedBy = User.Identity.Name,
                LastChangedDateTime = creationTime,
            };

            string fileName = instance.ApplicationId + "/" + instanceId + "/data/" + formId + "/" + newData.Id;
            newData.StorageUrl = fileName;

            if (instance.Data == null)
            {
                instance.Data = new Dictionary<string, Dictionary<string, Data>>();
            }

            if (!instance.Data.ContainsKey(formId))
            {
                instance.Data[formId] = new Dictionary<string, Data>();
            }

            instance.Data[formId][newData.Id] = newData;

            // store file as blob
            await _dataRepository.CreateDataInStorage(theStream, fileName);

            // update instance
            Instance result = await _instanceRepository.UpdateInstanceInCollectionAsync(instanceId, instance);

            return Ok(result);
        }

        private ApplicationInformation GetApplicationInformation(string applicationId)
        {
            string json = @"{
                'applicationId': 'KNS/sailor',
                'applicationOwnerId': 'KNS',
                'forms': {
                    'boatdata': {
                        'contentType': 'application/schema+json'
                    },
                    'crewlist': {
                        'contentType': 'application/pdf'
                    }
                }
                }";

            // dummy data TODO call repository
            return JsonConvert.DeserializeObject<ApplicationInformation>(json);           
            
        }

        Instance GetInstance(string instanceId)
        {
            string json = @"{
                'instanceOwnerId': '642',
                'applicationId': 'KNS/sailor',
                'applicationOwnerId': 'KNS'
            }";

            Instance instance = JsonConvert.DeserializeObject<Instance>(json);
            instance.Id = instanceId;

            return instance; 
        }
    }
}
