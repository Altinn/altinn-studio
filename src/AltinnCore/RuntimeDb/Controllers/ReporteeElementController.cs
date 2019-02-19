using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.Db.Models;
using AltinnCore.Runtime.Db.Repository;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace AltinnCore.Runtime.Db.Controllers
{
    [Route("api/[controller]")]
    public class ReporteeElementController : Controller
    {
        private readonly IReporteeElementRepository _reporteeElementRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="FormDataAPIController"/> class
        /// </summary>
        /// <param name="reporteeElementRepository">the form data repository handler</param>
        public ReporteeElementController(IReporteeElementRepository reporteeElementRepository)
        {
            _reporteeElementRepository = reporteeElementRepository;
        }

        // GET: api/<controller>
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/<controller>/?reporteeElementId
        [HttpGet("{reporteeId}")]
        public async Task<ActionResult> Get(string reporteeId, string reporteeElementId)
        {
            var result = await _reporteeElementRepository.GetReporteeElementFromCollectionAsync(reporteeId, reporteeElementId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        // POST api/<controller>/
        [HttpPost]
        public async Task<ActionResult> Post([FromBody]ReporteeElement reporteeElement)
        {
            var result = await _reporteeElementRepository.InsertReporteeElementIntoCollectionAsync(reporteeElement);            
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        // PUT api/<controller>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody]string value)
        {
        }

        // DELETE api/<controller>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
