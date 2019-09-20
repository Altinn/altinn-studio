using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Storage.Interface.Models;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Controller for setting and moving process flow of an instance.
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/process")]
    [ApiController]
    public class ProcessController : ControllerBase
    {
        private readonly ILogger<ProcessController> logger;
        private readonly IInstance instanceService;

        /// <summary>
        /// Initilizes a new instance of the <see cref="ProcessController"/>
        /// </summary>
        public ProcessController(
            ILogger<ProcessController> logger,
            IInstance instanceService)
        {
            this.logger = logger;
            this.instanceService = instanceService;
        }

        /// <summary>
        /// Get the process state of an instance.
        /// </summary>
        /// <returns>the instance's process state</returns>
        [HttpGet]
        public async Task<ActionResult<ProcessState>> GetProcessState(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

            ProcessState processState = instance.Process;

            return Ok(processState);
        }

        /// <summary>
        /// Gets a list of the next process elements that can be reached from the current process element.
        /// </summary>
        /// <returns>list of next process elements (tasks or events)</returns>
        [HttpGet("next")]
        public async Task<ActionResult> GetNextProcessElements(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);
            string currentTaskId = instance.Process?.CurrentTask?.ProcessElementId;

            return Ok();           
        }
    }
}
