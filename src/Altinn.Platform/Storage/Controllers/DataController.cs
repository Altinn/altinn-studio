using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// api for managing the form data
    /// </summary>
    [Route("api/v1/instances/{instanceId}/[controller]")]
    public class DataController : Controller
    {
        private readonly IDataRepository _dataRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="formRepository">the form data repository handler</param>
        public DataController(IDataRepository formRepository)
        {
            _dataRepository = formRepository;
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
        /// <returns>If the request was successful or not</returns>
        // POST /instances/{instanceId}/data/{formId}        
        [HttpPost("{formId}")]
        [DisableFormValueModelBinding]
        public async Task<ActionResult> UploadFile(string instanceId, string formId)
        {
            // check if instance id exist and user is allowed to change the instance data
            // check if data element exists, if so raise exception (Allready exists)
            // create new data element, store data in blob
            // update instance
            if (string.IsNullOrEmpty(instanceId) || string.IsNullOrEmpty(formId) || Request.Body != null)
            {
                return BadRequest();
            }

            MemoryStream formDataStream = new MemoryStream();
            /*
            // var xmlData = JsonConvert.SerializeObject(formData.FormDataXml);
            StreamWriter writer = new StreamWriter(formDataStream);
            writer.Write(formData.ContentType);
            writer.Flush();
            formDataStream.Position = 0;

            var result = await _formRepository.CreateDataInStorage(formDataStream, formData.FileName);
            if (!result)
            {
                return BadRequest();
            }
            */

            return Ok(true);
        }

        [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
        public class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
        {
            public void OnResourceExecuting(ResourceExecutingContext context)
            {
                var factories = context.ValueProviderFactories;
                factories.RemoveType<FormValueProviderFactory>();
                factories.RemoveType<JQueryFormValueProviderFactory>();
            }

            public void OnResourceExecuted(ResourceExecutedContext context)
            {
            }
        }
    }
}
