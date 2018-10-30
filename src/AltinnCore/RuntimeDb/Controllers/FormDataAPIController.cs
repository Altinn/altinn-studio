using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.Db.Models;
using AltinnCore.Runtime.Db.Repository;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.Db.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FormDataAPIController : ControllerBase
    {
        private readonly IFormDataRepository _formDataRepository;

        public FormDataAPIController(IFormDataRepository formDataRepository)
        {
            _formDataRepository = formDataRepository;
        }

        // GET api/values
        [HttpGet]
        public ActionResult<IEnumerable<string>> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/formdataapi/reporteeId/?reporteeElementId&formId
        [HttpGet("{reporteeId}")]
        public async Task<ActionResult<string>> Get(string reporteeId, string reporteeElementId, string formId)
        {
            var result = await _formDataRepository.GetFormDataFromCollectionAsync(reporteeId, reporteeElementId, formId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // POST api/formdataapi
        [HttpPost]
        public async Task<ActionResult> Post([FromBody] FormData formData)
        {
            var result = await _formDataRepository.InsertFormDataIntoCollectionAsync(formData);
            if (result == null) return BadRequest();
            return Ok(result);
        }

        // PUT api/values/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/values/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
