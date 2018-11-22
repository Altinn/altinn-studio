using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.Db.Models;
using AltinnCore.Runtime.Db.Repository;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.Db.Controllers
{
    /// <summary>
    /// api for managing the form data
    /// </summary>
    [Route("api/[controller]")]
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
        // GET api/values
        [HttpGet]
        public ActionResult<IEnumerable<string>> Get()
        {
            return new string[] { "value1", "value2" };
        }

        /// <summary>
        /// Get the formdata for the given reportee element id and the formid
        /// </summary>
        /// <param name="reporteeId">the owner of the reportee element</param>
        /// <param name="reporteeElementId">the reportee element id</param>
        /// <param name="formId">the form id</param>
        /// <returns>The get response</returns>
        // GET api/formdataapi/reporteeId/?reporteeElementId&formId
        [HttpGet("{reporteeId}")]
        public async Task<ActionResult<string>> Get(string reporteeId, string reporteeElementId, string formId)
        {
            var result = await _formDataRepository.GetFormDataFromCollectionAsync(reporteeId, reporteeElementId, formId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Save the form data
        /// </summary>
        /// <param name="formData">the form data to be stored</param>
        /// <returns>If the request was successful or not</returns>
        // POST api/formdataapi
        [HttpPost]
        public async Task<ActionResult> Post([FromBody] FormData formData)
        {
            var result = await _formDataRepository.InsertFormDataIntoCollectionAsync(formData);
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }
    }
}
