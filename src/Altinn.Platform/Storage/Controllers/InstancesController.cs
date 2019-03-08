using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace Altinn.Platform.Storage.Controllers
{
    [Route("dataservice/reportees/{reporteeId}/[controller]")]
    public class InstancesController : Controller
    {
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataController"/> class
        /// </summary>
        /// <param name="instanceRepository">the form data repository handler</param>
        public InstancesController(IInstanceRepository instanceRepository)
        {
            _instanceRepository = instanceRepository;
        }

        // GET dataservice/reportees/{reporteeId}/instances/
        [HttpGet]
        public async Task<ActionResult> Get(int reporteeId)
        {
            var result = await _instanceRepository.GetInstancesFromCollectionAsync(reporteeId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        // GET dataservice/reportees/{reporteeId}<controller>/{instanceId}
        [HttpGet("{instanceId}")]
        public async Task<ActionResult> Get(int reporteeId, Guid instanceId)
        {
            var result = await _instanceRepository.GetInstanceFromCollectionAsync(reporteeId, instanceId);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        // POST dataservice/reportees/{reporteeId}/instances
        [HttpPost]
        public async Task<ActionResult> Post([FromBody]Instance Instance)
        {
            var result = await _instanceRepository.InsertInstanceIntoCollectionAsync(Instance);            
            if (result == null)
            {
                return BadRequest();
            }

            return Ok(result);
        }

        // PUT dataservice/reportees/{reporteeId}/<controller>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody]string value)
        {
        }

        // DELETE dataservice/reportees/{reporteeId}/<controller>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
