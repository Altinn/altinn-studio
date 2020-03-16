using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Implements endpoints related to messagebox instances
    /// </summary>
    [Route("storage/api/v1/sbl/instances")]
    [ApiController]
    public class MessageBoxInstancesController : ControllerBase
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly AuthorizationHelper _authorizationHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="MessageBoxInstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="pdp">the policy decision point</param>
        /// <param name="logger">The logger to be used to perform logging from the controller.</param>
        public MessageBoxInstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IApplicationRepository applicationRepository,
            IPDP pdp,
            ILogger<AuthorizationHelper> logger)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _applicationRepository = applicationRepository;
            _authorizationHelper = new AuthorizationHelper(pdp, logger);
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <param name="state">the instance state; active, archived or deleted</param>
        /// <param name="language"> language nb, en, nn-NO</param>
        /// <returns>list of instances</returns>
        [HttpGet("{instanceOwnerPartyId:int}")]
        public async Task<ActionResult> GetMessageBoxInstanceList(int instanceOwnerPartyId, [FromQuery] string state, [FromQuery] string language)
        {
            string[] allowedStates = { "active", "archived", "deleted" };
            string[] acceptedLanguages = { "en", "nb", "nn" };

            string languageId = "nb";
            if (string.IsNullOrEmpty(state))
            {
                return BadRequest($"State is empty. Please provide on of: {string.Join(", ", allowedStates)}");
            }

            state = state.ToLower();
            if (!allowedStates.Contains(state))
            {
                return BadRequest($"Invalid instance state. Please provide on of: {string.Join(", ", allowedStates)}");
            }

            if (language != null && acceptedLanguages.Contains(language.ToLower()))
            {
                languageId = language;
            }

            List<Instance> allInstances = await _instanceRepository.GetInstancesInStateOfInstanceOwner(instanceOwnerPartyId, state);

            if (allInstances.Count <= 0)
            {
                return Ok(new List<MessageBoxInstance>());
            }

            List<MessageBoxInstance> autorizedInstances = await _authorizationHelper.AuthorizeMesseageBoxInstances(HttpContext.User, allInstances);
            List<string> appIds = autorizedInstances.Select(i => InstanceHelper.GetAppId(i)).Distinct().ToList();
            Dictionary<string, Dictionary<string, string>> appTitles = await _applicationRepository.GetAppTitles(appIds);
            List<MessageBoxInstance> messageBoxInstances = InstanceHelper.AddTitleToInstances(autorizedInstances, appTitles, languageId);

            return Ok(messageBoxInstances);
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <param name="language"> language id en, nb, nn-NO"</param>
        /// <returns>list of instances</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> GetMessageBoxInstance(int instanceOwnerPartyId, Guid instanceGuid, [FromQuery] string language)
        {
            string[] acceptedLanguages = { "en", "nb", "nn" };
            string languageId = "nb";

            if (language != null && acceptedLanguages.Contains(language.ToLower()))
            {
                languageId = language;
            }

            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);

            if (instance == null)
            {
                return NotFound($"Could not find instance {instanceId}");
            }

            //// TODO: Authorise

            Dictionary<string, Dictionary<string, string>> appTitle = await _applicationRepository.GetAppTitles(new List<string> { instance.AppId });

            MessageBoxInstance messageBoxInstance = InstanceHelper.ConvertToMessageBoxInstanceList(new List<Instance> { instance }, appTitle, languageId).First();

            return Ok(messageBoxInstance);
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <returns>list of instances</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}/events")]
        public async Task<ActionResult> GetMessageBoxInstanceEvents(
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
            string[] eventTypes = new string[]
            {
                InstanceEventType.Created.ToString(),
                InstanceEventType.Deleted.ToString(),
                InstanceEventType.Saved.ToString(),
                InstanceEventType.Submited.ToString(),
                InstanceEventType.Undeleted.ToString()
            };

            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            List<InstanceEvent> result = await _instanceEventRepository.ListInstanceEvents(instanceId, eventTypes, null, null);

            // filtering out Create & delete data element event
            result = result.Where(r => string.IsNullOrEmpty(r.DataId) || r.EventType.Equals(InstanceEventType.Saved)).ToList();

            return Ok(InstanceHelper.ConvertToSBLInstanceEvent(result));
        }

        /// <summary>
        /// Undelete a soft deleted instance
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner</param>
        /// <param name="instanceGuid">instance id</param>
        /// <returns>True if the instance was undeleted.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_DELETE)]
        [HttpPut("{instanceOwnerPartyId:int}/{instanceGuid:guid}/undelete")]
        public async Task<ActionResult> Undelete(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance;

            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Didn't find the object that should be restored with instanceId={instanceId}");
                }

                return StatusCode(500, $"Unknown database exception in restore: {dce}");
            }

            if (instance.Status.HardDeleted.HasValue)
            {
                return BadRequest("Instance was permanently deleted and cannot be restored.");
            }
            else if (instance.Status.SoftDeleted.HasValue)
            {
                instance.LastChangedBy = User.GetUserOrOrgId();
                instance.LastChanged = DateTime.UtcNow;
                instance.Status.SoftDeleted = null;

                InstanceEvent instanceEvent = new InstanceEvent
                {
                    Created = DateTime.UtcNow,
                    EventType = InstanceEventType.Undeleted.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                    User = new PlatformUser
                    {
                        UserId = User.GetUserIdAsInt(),
                        AuthenticationLevel = User.GetAuthenticationLevel(),
                        OrgId = User.GetOrg(),
                    }
                };

                try
                {
                    await _instanceRepository.Update(instance);
                    await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
                    return Ok(true);
                }
                catch (Exception e)
                {
                    return StatusCode(500, $"Unknown exception in restore: {e}");
                }
            }

            return Ok(true);
        }

        /// <summary>
        /// Marks an instance for deletion in storage.
        /// </summary>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instanceOwnerPartyId">instance owner</param>
        /// <param name="hard">if true is marked for hard delete.</param>
        /// <returns>true if instance was successfully deleted</returns>
        /// DELETE /instances/{instanceId}?instanceOwnerPartyId={instanceOwnerPartyId}?hard={bool}
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_DELETE)]
        [HttpDelete("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Delete(Guid instanceGuid, int instanceOwnerPartyId, bool hard)
        {
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

            Instance instance;
            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerPartyId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Didn't find the object that should be deleted with instanceId={instanceId}");
                }

                return StatusCode(500, $"Unknown database exception in delete: {dce}");
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unknown exception in delete: {e}");
            }

            DateTime now = DateTime.UtcNow;

            instance.Status ??= new InstanceStatus();

            if (hard)
            {
                instance.Status.HardDeleted = now;
                instance.Status.SoftDeleted ??= now;
            }
            else
            {
                instance.Status.SoftDeleted = now;
            }

            instance.LastChangedBy = User.GetUserOrOrgId();
            instance.LastChanged = now;

            InstanceEvent instanceEvent = new InstanceEvent
            {
                Created = DateTime.UtcNow,
                EventType = InstanceEventType.Deleted.ToString(),
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                User = new PlatformUser
                {
                    UserId = User.GetUserIdAsInt(),
                    AuthenticationLevel = User.GetAuthenticationLevel(),
                    OrgId = User.GetOrg(),
                },
            };

            try
            {
                await _instanceRepository.Update(instance);
                await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unknown exception in delete: {e}");
            }

            return Ok(true);
        }
    }
}
