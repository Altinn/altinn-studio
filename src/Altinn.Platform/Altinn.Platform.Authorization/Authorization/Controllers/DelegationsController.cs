using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Controller responsible for all operations for managing delegations of Altinn Apps
    /// </summary>
    [ApiController]
    public class DelegationsController : ControllerBase
    {
        private readonly IContextHandler _contextHandler;
        private readonly IPolicyRetrievalPoint _prp;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationsController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        /// <param name="logger">the logger.</param>
        public DelegationsController(IContextHandler contextHandler, IPolicyRetrievalPoint policyRetrievalPoint, ILogger<DelegationsController> logger)
        {
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
            _logger = logger;
        }

        /// <summary>
        /// Endpoint for making a delegation of an Altinn App between two parties
        /// </summary>
        /// <param name="model">A Generic model</param>
        [HttpPost]
        [Route("authorization/api/v1/[controller]/{org}/{app}/{offeredBy}/{coveredBy}/")]
        public async Task<ActionResult> Post([FromBody] List<Rule> model)
        {
            try
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.ToString());
                return StatusCode(500);
            }
        }

        /// <summary>
        /// Test method. Should be deleted?
        /// </summary>
        /// <returns>test string</returns>
        [HttpGet]
        [Route("authorization/api/v1/[controller]")]
        public string Get()
        {
            return "Hello world!";
        }
    }
}
