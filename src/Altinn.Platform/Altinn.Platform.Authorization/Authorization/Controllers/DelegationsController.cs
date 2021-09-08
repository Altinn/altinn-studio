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
using Altinn.Platform.Authorization.Helpers;
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
        private readonly IPolicyAdministrationPoint _pap;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationsController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        /// <param name="policyAdministrationPoint">The policy administration point</param>
        /// <param name="logger">the logger.</param>
        public DelegationsController(IContextHandler contextHandler, IPolicyRetrievalPoint policyRetrievalPoint, IPolicyAdministrationPoint policyAdministrationPoint, ILogger<DelegationsController> logger)
        {
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
            _pap = policyAdministrationPoint;
            _logger = logger;
        }

        /// <summary>
        /// Endpoint for adding one or more rules for the given app/offeredby/coveredby. This updates or creates a new delegated policy of type "DirectlyDelegated". DelegatedByUserId is included to store history information in 3.0.
        /// </summary>
        /// <param name="rules">All rules to be delegated</param>
        /// <response code="200">Ok</response>
        /// <response code="206" cref="CustomErrorModel">Partial Content</response>
        /// <response code="400" cref="CustomErrorModel">Bad Request</response>
        [HttpPost]
        ////[Authorize(Policy = AuthzConstants.DELEGATIONS_ALTINNII)]
        [Route("authorization/api/v1/[controller]/AddRules")]
        public async Task<ActionResult> Post([FromBody] List<Rule> rules)
        {
            if (rules == null || rules.Count < 1)
            {
                return BadRequest("Missing rules in body");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid model");
            }

            try
            {
                Dictionary<string, bool> delegationResults = await _pap.TryWriteDelegationPolicyRules(rules);

                if (delegationResults.Values.All(result => result == true))
                {
                    _logger.LogInformation("Delegation completed");
                    return Created("Created", delegationResults);
                }

                _logger.LogInformation("Delegation could not be completed");
                return StatusCode(500, $"Unable to complete delegation");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to store delegation rules in database. {e}");
                return StatusCode(500, $"Unable to store delegation rules in database. {e}");
            }
        }

        /// <summary>
        /// Endpoint for retrieving delegated rules between parties
        /// </summary>
        [HttpPost]
        [Route("authorization/api/v1/[controller]/GetRules")]
        public async Task<ActionResult<List<Rule>>> GetRules([FromBody] RuleMatch ruleMatch, [FromQuery] bool onlyDirectDelegations = false)
        {
            try
            {
                return StatusCode(404, "Not yet implemented");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to get rules. {e}");
                return StatusCode(500, $"Unable to get rules. {e}");
            }
        }

        /// <summary>
        /// Endpoint for deleting delegated rules between parties
        /// </summary>
        [HttpPost]
        [Route("authorization/api/v1/[controller]/DeleteRules")]
        public async Task<ActionResult> DeleteRules([FromBody] List<string> ruleIds)
        {
            try
            {
                return StatusCode(404, "Not yet implemented");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to delete rules. {e}");
                return StatusCode(500, $"Unable to delete rules. {e}");
            }
        }

        /// <summary>
        /// Endpoint for deleting an entire delegated policy between parties
        /// </summary>
        [HttpPost]
        [Route("authorization/api/v1/[controller]/DeletePolicy")]
        public async Task<ActionResult> DeletePolicy([FromBody] RuleMatch policyMatch)
        {
            try
            {
                return StatusCode(404, "Not yet implemented");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to delete delegated policy. {e}");
                return StatusCode(500, $"Unable to delete delegated policy. {e}");
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
