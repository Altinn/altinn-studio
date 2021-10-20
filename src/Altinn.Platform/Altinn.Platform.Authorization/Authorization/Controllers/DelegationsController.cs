using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Controller responsible for all operations for managing delegations of Altinn Apps
    /// </summary>
    [ApiController]
    public class DelegationsController : ControllerBase
    {
        private readonly IPolicyAdministrationPoint _pap;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationsController"/> class.
        /// </summary>
        /// <param name="policyAdministrationPoint">The policy administration point</param>
        /// <param name="logger">the logger.</param>
        public DelegationsController(IPolicyAdministrationPoint policyAdministrationPoint, ILogger<DelegationsController> logger)
        {
            _pap = policyAdministrationPoint;
            _logger = logger;
        }

        /// <summary>
        /// Endpoint for adding one or more rules for the given app/offeredby/coveredby. This updates or creates a new delegated policy of type "DirectlyDelegated". DelegatedByUserId is included to store history information in 3.0.
        /// </summary>
        /// <param name="rules">All rules to be delegated</param>
        /// <response code="201" cref="List{Rule}">Created</response>
        /// <response code="206" cref="List{Rule}">Partial Content</response>
        /// <response code="400">Bad Request</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPost]
        ////[Authorize(Policy = AuthzConstants.ALTINNII_AUTHORIZATION)]
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
                List<Rule> delegationResults = await _pap.TryWriteDelegationPolicyRules(rules);

                if (delegationResults.All(r => r.CreatedSuccessfully))
                {
                    return Created("Created", delegationResults);
                }

                if (delegationResults.Any(r => r.CreatedSuccessfully))
                {
                    return StatusCode(206, delegationResults);
                }

                _logger.LogError("Delegation could not be completed. None of the rules could be processed, indicating invalid or incomplete input.", rules);
                return StatusCode(400, $"Delegation could not be completed");
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Delegation could not be completed. Unexpected exception.");
                return StatusCode(500, $"Delegation could not be completed due to an unexpected exception.");
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
        /// <response code="201" cref="List{Rule}">Deleted</response>
        /// <response code="206" cref="List{Rule}">Partial Content</response>
        /// <response code="400">Bad Request</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPost]
        ////[Authorize(Policy = AuthzConstants.DELEGATIONS_ALTINNII)]
        [Route("authorization/api/v1/[controller]/DeleteRules")]
        public async Task<ActionResult> DeleteRules([FromBody] List<RuleMatch> ruleMatches)
        {
            if (ruleMatches == null || ruleMatches.Count < 1)
            {
                return BadRequest("Missing ruleMatches in body");
            }

            if (ruleMatches.All(r => string.IsNullOrWhiteSpace(r.RuleId)))
            {
                return BadRequest("Not all ruleMAtches has RuleId");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid model");
            }

            try
            {
                List<Rule> deletionResults = await _pap.TryDeleteDelegationPolicyRules(ruleMatches);

                if (deletionResults.Count == ruleMatches.Count )
                {
                    _logger.LogInformation("Deletion completed");
                    return Created("Created", deletionResults);
                }

                if (deletionResults.Count > 0)
                {
                    _logger.LogInformation("Partial deletion completed");
                    return StatusCode(206, deletionResults);
                }

                _logger.LogInformation("Deletion could not be completed");
                return StatusCode(500, $"Unable to complete deletion");

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
        public async Task<ActionResult> DeletePolicy([FromBody] List<RuleMatch> policyMatches)
        {
            if (policyMatches == null || policyMatches.Count < 1)
            {
                return BadRequest("Missing ruleMatches in body");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid model");
            }

            try
            {
                List<RuleMatch> deletionResults = await _pap.TryDeleteDelegationPolicies(policyMatches);

                if (deletionResults.Count == policyMatches.Count)
                {
                    _logger.LogInformation("Deletion completed");
                    return Created("Created", deletionResults);
                }

                if (deletionResults.Count > 0)
                {
                    _logger.LogInformation("Partial deletion completed");
                    return StatusCode(206, deletionResults);
                }

                _logger.LogInformation("Deletion could not be completed");
                return StatusCode(500, $"Unable to complete deletion");

            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to delete rules. {e}");
                return StatusCode(500, $"Unable to delete rules. {e}");
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
