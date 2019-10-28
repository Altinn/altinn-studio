using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to managing authorization rules
    /// </summary>
    [Route("authorization/api/v1/policies")]
    [ApiController]
    public class PolicyController : ControllerBase
    {
        private readonly ILogger<PolicyController> logger;
        private readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyController"/> class.      
        /// </summary>
        /// <param name="prp">The policy retrieval point.</param>
        /// <param name="logger">logger</param>
        public PolicyController(
            IPolicyRetrievalPoint prp,
            ILogger<PolicyController> logger)
        {
            _prp = prp;
            this.logger = logger;
        }

        /// <summary>
        /// Saves policy file to storage    
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileStream">The policy file for the app.</param>
        [HttpPost]
        public async Task<ActionResult> WritePolicy([FromQuery] string org, [FromQuery] string app, [FromBody] Stream fileStream)
        {
            if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(app) || fileStream == null)
            {
                return BadRequest();
            }

            try
            {
                bool successfullyStored = await _prp.WritePolicyAsync(org, app, fileStream);

                if (successfullyStored)
                {
                    return Ok();
                }
            }
            catch (ArgumentException ex)
            {
                logger.LogError(ex.Message);
                return BadRequest();
            }

            return BadRequest();
        }
    }
}
