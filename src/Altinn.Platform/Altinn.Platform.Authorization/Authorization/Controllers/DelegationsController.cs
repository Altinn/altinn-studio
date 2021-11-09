using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Helpers;
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
        [Authorize(Policy = AuthzConstants.ALTINNII_AUTHORIZATION)]
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

                string rulesJson = JsonSerializer.Serialize(rules);
                _logger.LogError("Delegation could not be completed. None of the rules could be processed, indicating invalid or incomplete input:\n{rulesJson}", rulesJson);
                return StatusCode(400, $"Delegation could not be completed");
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Delegation could not be completed. Unexpected exception.");
                return StatusCode(500, $"Delegation could not be completed due to an unexpected exception.");
            }
        }

        /// <summary>
        /// Endpoint for deleting delegated rules between parties
        /// </summary>
        /// <response code="200" cref="List{Rule}">Deleted</response>
        /// <response code="206" cref="List{Rule}">Partial Content</response>
        /// <response code="400">Bad Request</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPost]
        [Authorize(Policy = AuthzConstants.ALTINNII_AUTHORIZATION)]
        [Route("authorization/api/v1/[controller]/DeleteRules")]
        public async Task<ActionResult> DeleteRule([FromBody] List<RequestToDelete> rulesToDelete)
        {
            if (rulesToDelete == null || rulesToDelete.Count < 1)
            {
                return BadRequest("Missing rulesToDelete in body");
            }

            if (rulesToDelete.Any(r => r.RuleIds == null || r.RuleIds.Count == 0))
            {
                return BadRequest("Not all RequestToDelete has RuleId");
            }

            try
            { 
                if (rulesToDelete.GroupBy(x => PolicyHelper.GetAltinnAppDelegationPolicyPath(x.PolicyMatch)).Any(g => g.Count() > 1))
                {
                    return BadRequest("Input should not contain any duplicate policies");
                }
            }
            catch
            {
                return BadRequest("Not all requests to delete contains valid policy paths");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            List<Rule> deletionResults = await _pap.TryDeleteDelegationPolicyRules(rulesToDelete);
            int ruleCountToDelete = DelegationHelper.GetRulesCountToDeleteFromRequestToDelete(rulesToDelete);

            if (deletionResults.Count == ruleCountToDelete)
            {
                _logger.LogInformation("Deletion completed");
                return StatusCode(200, deletionResults);
            }

            if (deletionResults.Count > 0)
            {
                _logger.LogInformation("Partial deletion completed");
                return StatusCode(206, deletionResults);
            }

            _logger.LogInformation("Deletion could not be completed");
            return StatusCode(500, $"Unable to complete deletion");
        }

        /// <summary>
        /// Endpoint for deleting an entire delegated policy between parties
        /// </summary>
        /// <response code="200" cref="List{Rule}">Deleted</response>
        /// <response code="206" cref="List{Rule}">Partial Content</response>
        /// <response code="400">Bad Request</response>
        /// <response code="500">Internal Server Error</response>
        [HttpPost]
        [Authorize(Policy = AuthzConstants.ALTINNII_AUTHORIZATION)]
        [Route("authorization/api/v1/[controller]/DeletePolicy")]
        public async Task<ActionResult> DeletePolicy([FromBody] List<RequestToDelete> policiesToDelete)
        {
            if (policiesToDelete == null || policiesToDelete.Count < 1)
            {
                return BadRequest("Missing policiesToDelete in body");
            }

            try
            {
                if (policiesToDelete.GroupBy(x => PolicyHelper.GetAltinnAppDelegationPolicyPath(x.PolicyMatch)).Any(g => g.Count() > 1))
                {
                    return BadRequest("Input should not contain any duplicate policies");
                }
            }
            catch
            {
                return BadRequest("Not all requests to delete contains valid policy paths");
            }
            
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
                        
            List<Rule> deletionResults = await _pap.TryDeleteDelegationPolicies(policiesToDelete);
            int countPolicies = DelegationHelper.GetPolicyCount(deletionResults);

            if (countPolicies == policiesToDelete.Count)
            {
                _logger.LogInformation("Deletion completed");
                return StatusCode(200, deletionResults);
            }

            if (countPolicies > 0)
            {
                _logger.LogInformation("Partial deletion completed");
                return StatusCode(206, deletionResults);
            }

            _logger.LogInformation("Deletion could not be completed");
            return StatusCode(500, $"Unable to complete deletion");            
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
