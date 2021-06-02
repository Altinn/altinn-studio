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
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Implements endpoints specifically for the Altinn II message box.
    /// </summary>
    [Route("storage/api/v1/sbl/instances")]
    [ApiController]
    public class MessageBoxInstancesController : ControllerBase
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;
        private readonly ITextRepository _textRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly AuthorizationHelper _authorizationHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="MessageBoxInstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository handler</param>
        /// <param name="textRepository">the text repository handler</param>
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="pdp">the policy decision point</param>
        /// <param name="logger">The logger to be used to perform logging from the controller.</param>
        public MessageBoxInstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            ITextRepository textRepository,
            IApplicationRepository applicationRepository,
            IPDP pdp,
            ILogger<AuthorizationHelper> logger)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _textRepository = textRepository;
            _applicationRepository = applicationRepository;
            _authorizationHelper = new AuthorizationHelper(pdp, logger);
        }

        /// <summary>
        /// Search through instances to find match based on query params.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The instance owner party id</param>
        /// <param name="appId">The application id</param>
        /// <param name="includeActive">Boolean indicating whether to include active instances.</param>
        /// <param name="includeArchived">Boolean indicating whether to include archived instances.</param>
        /// <param name="includeDeleted">Boolean indicating whether to include deleted instances.</param>
        /// <param name="lastChanged">Last changed date.</param>
        /// <param name="created">Created time.</param>
        /// <param name="searchString">Search string.</param>
        /// <param name="archiveReference">The archive reference.</param>
        /// <param name="language"> language nb, en, nn-NO</param>
        /// <returns>list of instances</returns>
        [Authorize]
        [HttpGet("search")]
        public async Task<ActionResult> SearchMessageBoxInstances(
            [FromQuery(Name = "instanceOwner.partyId")] int instanceOwnerPartyId,
            [FromQuery] string appId,
            [FromQuery] bool includeActive,
            [FromQuery] bool includeArchived,
            [FromQuery] bool includeDeleted,
            [FromQuery] string lastChanged,
            [FromQuery] string created,
            [FromQuery] string searchString,
            [FromQuery] string archiveReference,
            [FromQuery] string language)
        {
            string[] acceptedLanguages = { "en", "nb", "nn" };

            string languageId = "nb";

            if (language != null && acceptedLanguages.Contains(language.ToLower()))
            {
                languageId = language.ToLower();
            }

            Dictionary<string, StringValues> queryParams = QueryHelpers.ParseQuery(Request.QueryString.Value);

            if (!string.IsNullOrEmpty(archiveReference))
            {
                if ((includeActive == includeArchived) && (includeActive == includeDeleted))
                {
                    includeActive = false;
                    includeDeleted = true;
                    includeArchived = true;
                }
                else if (includeActive && !includeArchived && !includeDeleted)
                {
                    return Ok(new List<MessageBoxInstance>());
                }
                else if (includeActive && (includeArchived || includeDeleted))
                {
                    includeActive = false;
                }
            }

            GetStatusFromQueryParams(includeActive, includeArchived, includeDeleted, queryParams);
            queryParams.Add("sortBy", "desc:lastChanged");
            queryParams.Add("status.isHardDeleted", "false");

            if (!string.IsNullOrEmpty(searchString))
            {
                StringValues applicationIds = await MatchStringToAppTitle(searchString);
                if (!applicationIds.Any() || (!string.IsNullOrEmpty(appId) && !applicationIds.Contains(appId)))
                {
                    return Ok(new List<MessageBoxInstance>());
                }
                else if (string.IsNullOrEmpty(appId))
                {
                    queryParams.Add("appId", applicationIds);
                }

                queryParams.Remove(nameof(searchString));
            }

            InstanceQueryResponse queryResponse = await _instanceRepository.GetInstancesFromQuery(queryParams, string.Empty, 100);

            if (queryResponse?.Exception != null)
            {
                if (queryResponse.Exception.StartsWith("Unknown query parameter"))
                {
                    return BadRequest(queryResponse.Exception);
                }

                return StatusCode(500, queryResponse.Exception);
            }

            if (queryResponse == null || queryResponse.Count <= 0)
            {
                return Ok(new List<MessageBoxInstance>());
            }

            List<Instance> allInstances = queryResponse.Instances;

            allInstances.RemoveAll(i => i.VisibleAfter > DateTime.UtcNow);

            allInstances.ForEach(i =>
            {
                if (i.Status.IsArchived || i.Status.IsSoftDeleted)
                {
                    i.DueBefore = null;
                }
            });

            List<MessageBoxInstance> authorizedInstances =
                    await _authorizationHelper.AuthorizeMesseageBoxInstances(HttpContext.User, allInstances);
            List<string> appIds = authorizedInstances.Select(i => InstanceHelper.GetAppId(i)).Distinct().ToList();

            List<TextResource> texts = await _textRepository.Get(appIds, languageId);
            InstanceHelper.ReplaceTextKeys(authorizedInstances, texts, languageId);

            return Ok(authorizedInstances);
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <param name="language"> language id en, nb, nn-NO"</param>
        /// <returns>list of instances</returns>
        [Authorize]
        [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> GetMessageBoxInstance(
            int instanceOwnerPartyId,
            Guid instanceGuid,
            [FromQuery] string language)
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

            List<MessageBoxInstance> authorizedInstanceList =
                await _authorizationHelper.AuthorizeMesseageBoxInstances(
                    HttpContext.User, new List<Instance> { instance });
            if (authorizedInstanceList.Count <= 0)
            {
                return Forbid();
            }

            MessageBoxInstance authorizedInstance = authorizedInstanceList.First();

            // get app texts and exchange all text keys.
            List<TextResource> texts = await _textRepository.Get(new List<string> { instance.AppId }, languageId);
            InstanceHelper.ReplaceTextKeys(new List<MessageBoxInstance> { authorizedInstance }, texts, languageId);

            return Ok(authorizedInstance);
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
            string[] eventTypes =
            {
                InstanceEventType.Created.ToString(),
                InstanceEventType.Deleted.ToString(),
                InstanceEventType.Saved.ToString(),
                InstanceEventType.Submited.ToString(),
                InstanceEventType.Undeleted.ToString(),
                InstanceEventType.SubstatusUpdated.ToString()
            };

            if (string.IsNullOrEmpty(instanceId))
            {
                return BadRequest("Unable to perform query.");
            }

            List<InstanceEvent> allInstanceEvents =
                await _instanceEventRepository.ListInstanceEvents(instanceId, eventTypes, null, null);

            List<InstanceEvent> filteredInstanceEvents = InstanceEventHelper.RemoveDuplicateEvents(allInstanceEvents);

            return Ok(InstanceHelper.ConvertToSBLInstanceEvent(filteredInstanceEvents));
        }

        /// <summary>
        /// Restore a soft deleted instance
        /// </summary>
        /// <param name="instanceOwnerPartyId">instance owner</param>
        /// <param name="instanceGuid">instance id</param>
        /// <returns>True if the instance was restored.</returns>
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

            if (instance.Status.IsHardDeleted)
            {
                return NotFound("Instance was permanently deleted and cannot be restored.");
            }
            else if (instance.Status.IsSoftDeleted)
            {
                instance.LastChangedBy = User.GetUserOrOrgId();
                instance.LastChanged = DateTime.UtcNow;
                instance.Status.IsSoftDeleted = false;
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
                instance.Status.IsHardDeleted = true;
                instance.Status.IsSoftDeleted = true;
                instance.Status.HardDeleted = now;
                instance.Status.SoftDeleted ??= now;
            }
            else
            {
                instance.Status.IsSoftDeleted = true;
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

        private async Task<StringValues> MatchStringToAppTitle(string searchString)
        {
            List<string> appIds = new List<string>();

            Dictionary<string, string> appTitles = await _applicationRepository.GetAllAppTitles();

            foreach (KeyValuePair<string, string> entry in appTitles)
            {
                if (entry.Value.Contains(searchString.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    appIds.Add(entry.Key);
                }
            }

            return new StringValues(appIds.ToArray());
        }

        private void GetStatusFromQueryParams(
           bool includeActive,
           bool includeArchived,
           bool includeDeleted,
           Dictionary<string, StringValues> queryParams)
        {
            if ((includeActive == includeArchived) && (includeActive == includeDeleted))
            {
                // no filter required
            }
            else if (!includeArchived && !includeDeleted)
            {
                queryParams.Add("status.isArchived", "false");
                queryParams.Add("status.isSoftDeleted", "false");
            }
            else if (!includeActive && !includeDeleted)
            {
                queryParams.Add("status.isArchived", "true");
                queryParams.Add("status.isSoftDeleted", "false");
            }
            else if (!includeActive && !includeArchived)
            {
                queryParams.Add("status.isSoftDeleted", "true");
            }
            else if (includeActive && includeArchived)
            {
                queryParams.Add("status.isSoftDeleted", "false");
            }
            else if (includeArchived)
            {
                queryParams.Add("status.isArchivedOrSoftDeleted", "true");
            }
            else
            {
                queryParams.Add("status.isActiveorSoftDeleted", "true");
            }

            queryParams.Remove(nameof(includeActive));
            queryParams.Remove(nameof(includeArchived));
            queryParams.Remove(nameof(includeDeleted));
        }
    }
}
