using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using AltinnCore.Runtime.DataService.Models;
using AltinnCore.Runtime.DataService.Repository;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.DataService.Controllers
{
    /// <summary>
    /// api for managing the form data
    /// </summary>
    [Route("runtimedbapi/[controller]")]
    [ApiController]
    public class FormDataAPIController : ControllerBase
    {
        private readonly IFormDataRepository _formDataRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="FormDataAPIController"/> class
        /// </summary>
        /// <param name="formDataRepository">the form data repository handler</param>
        public FormDataAPIController(IFormDataRepository formDataRepository)
        {
            _formDataRepository = formDataRepository;
        }

        /// <summary>
        /// Default test api
        /// </summary>
        /// <returns>The test return values</returns>
        // GET api/formdataapi
        [HttpGet]
        public ActionResult<IEnumerable<string>> Get()
        {
            return new string[] { "value1", "value2" };
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="formData">the form data to be stored</param>
        /// <returns>If the request was successful or not</returns>
        // POST api/formdataapi/{reporteeId}/?reporteeElementId&formId
        [HttpPost("{reporteeId}")]
        public async Task<ActionResult> Post([FromBody] FormData formData, string reporteeId, string reporteeElementId, string formId)
        {
            if (formData == null || string.IsNullOrEmpty(reporteeId) || string.IsNullOrEmpty(reporteeElementId) || string.IsNullOrEmpty(formId))
            {
                return BadRequest();
            }

            string fileName = reporteeId + "_" + reporteeElementId + "_" + formId + ".json";

            MemoryStream formDataStream = new MemoryStream();

            var jsonData = JsonConvert.SerializeObject(formData);
            StreamWriter writer = new StreamWriter(formDataStream);
            writer.Write(jsonData);
            writer.Flush();            
            formDataStream.Position = 0;

            var result = await _formDataRepository.CreateFormDataInStorage(formDataStream, fileName);
            if (!result)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="reporteeId">the owner of the reportee element</param>
        /// <param name="reporteeElementId">the reportee element id</param>
        /// <param name="formId">the form id</param>
        /// <returns>The get response</returns>        
        /// <returns>If the request was successful or not</returns>
        // POST api/formdataapi/{reporteeId}/?reporteeElementId&formId
        [HttpGet("{reporteeId}")]
        public async Task<ActionResult> Get(string reporteeId, string reporteeElementId, string formId)
        {
            if (string.IsNullOrEmpty(reporteeId) || string.IsNullOrEmpty(reporteeElementId) || string.IsNullOrEmpty(formId))
            {
                return BadRequest();
            }

            string fileName = reporteeId + "_" + reporteeElementId + "_" + formId + ".json";
           
            var result = await _formDataRepository.GetFormDataInStorage(fileName);

            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }
    }
}
