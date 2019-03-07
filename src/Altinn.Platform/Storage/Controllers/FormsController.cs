using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// api for managing the form data
    /// </summary>
    [Route("dataservice/instances/{instanceId}/[controller]/")]
    [ApiController]
    public class FormsController : ControllerBase
    {
        private readonly IDataRepository _formRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="FormsController"/> class
        /// </summary>
        /// <param name="formRepository">the form data repository handler</param>
        public FormsController(IDataRepository formRepository)
        {
            _formRepository = formRepository;
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
          
            var result = await _formRepository.GetDataInStorage(fileName);

            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="formData">the form data to be stored</param>
        /// <returns>If the request was successful or not</returns>
        // POST dataservice/instances/{instanceid}/forms/
        public async Task<ActionResult> Post([FromBody] Data formData)
        {
            if (formData == null || string.IsNullOrEmpty(formData.FileName) || string.IsNullOrEmpty(formData.FormDataXml))
            {
                return BadRequest();
            }

            MemoryStream formDataStream = new MemoryStream();

            // var xmlData = JsonConvert.SerializeObject(formData.FormDataXml);
            StreamWriter writer = new StreamWriter(formDataStream);
            writer.Write(formData.FormDataXml);
            writer.Flush();
            formDataStream.Position = 0;

            var result = await _formRepository.CreateDataInStorage(formDataStream, formData.FileName);
            if (!result)
            {
                return BadRequest();
            }

            return Ok(result);
        }
    }
}
