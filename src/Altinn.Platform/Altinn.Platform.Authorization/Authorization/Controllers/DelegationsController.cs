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
        /// Endpoint for making a delegation of an Altinn App between two parties
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredBy">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <param name="rules">Array of rules to be delegated</param>
        [HttpPost]
        [Route("authorization/api/v1/[controller]/{org}/{app}/{offeredBy}/{coveredBy}/")]
        public async Task<ActionResult> Post([FromRoute] string org, [FromRoute] string app, [FromRoute] int offeredBy, [FromRoute] string coveredBy, [FromBody] List<Rule> rules)
        {
            if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(app) ||
            offeredBy == 0 || string.IsNullOrEmpty(coveredBy) || rules == null || rules.Count < 1)
            {
                return BadRequest("Missing parameter. Values: org, app, offeredBy, coveredBy or rules cannot be null or empty");
            }

            ////var item = HttpContext.Items[_accessTokenSettings.AccessTokenHttpContextId];

            int createdByUserId = rules.First().DelegatedByUserId;

            if (!PolicyHelper.TryParseCoveredBy(coveredBy, out _, out _))
            {
                return BadRequest($"CoveredBy parameter invalid: {coveredBy}. Value must be either a valid PartyId prefixed with 'p' or a valid UserId prefixed with 'u'.");
            }

            try
            {
                bool success = await _pap.WriteDelegationPolicy(org, app, offeredBy, coveredBy, createdByUserId, rules);

                if (success)
                {
                    _logger.LogInformation("Delegation completed");
                    return Created("Delegation completed", success);
                }

                _logger.LogInformation("Delegation could not be completed");
                return StatusCode(500, $"Unable to complete delegation");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to store delegation change in database. {e}");
                return StatusCode(500, $"Unable to store delegation change in database. {e}");
            }
        }

        /// <summary>
        /// Endpoint for making a delegation of an Altinn App between two parties
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredBy">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        [HttpGet]
        [Route("authorization/api/v1/[controller]/{org}/{app}/{offeredBy}/{coveredBy}/")]
        public async Task<ActionResult<DelegatedPolicy>> Get([FromRoute] string org, [FromRoute] string app, [FromRoute] int offeredBy, [FromRoute] string coveredBy)
        {
            if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(app) ||
            offeredBy == 0 || string.IsNullOrEmpty(coveredBy))
            {
                return BadRequest("Missing parameter. Values: org, app, offeredBy, coveredBy cannot be null or empty");
            }

            ////var item = HttpContext.Items[_accessTokenSettings.AccessTokenHttpContextId];

            int coveredByUserId, coveredByPartyId;
            if (!PolicyHelper.TryParseCoveredBy(coveredBy, out coveredByPartyId, out coveredByUserId))
            {
                return BadRequest($"CoveredBy parameter invalid: {coveredBy}. Value must be either a valid PartyId prefixed with 'p' or a valid UserId prefixed with 'u'.");
            }

            try
            {
                DelegatedPolicy result = await _pap.GetDelegationPolicy(org, app, offeredBy, coveredByPartyId, coveredByUserId);

                if (result != null)
                {
                    _logger.LogInformation("Delegation retrieved");
                    return result;
                }

                _logger.LogInformation("Delegation could not be completed");
                return StatusCode(500, $"Unable to complete delegation");
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to read delegation change from database. {e}");
                return StatusCode(500, $"Unable to read delegation change from database. {e}");
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
