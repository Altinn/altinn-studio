using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Storage.Interface.Models;

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
        private readonly IApplicationRepository _applicationRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="MessageBoxInstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="applicationRepository">the application repository handler</param>
        public MessageBoxInstancesController(
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository)
        {
            _instanceRepository = instanceRepository;
            _applicationRepository = applicationRepository;
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="state">the instance state; active, archived or deleted</param>
        /// <param name="language"> language nb, en, nn-NO</param>
        /// <returns>list of instances</returns>
        [HttpGet("{instanceOwnerId:int}")]
        public async Task<ActionResult> GetMessageBoxInstanceList(int instanceOwnerId, [FromQuery] string state, [FromQuery] string language)
        {
            string[] allowedStates = new string[] { "active", "archived", "deleted" };
            string[] acceptedLanguages = new string[] { "en", "nb", "nn-no" };
            string languageId = "nb";
            state = state.ToLower();
            if (string.IsNullOrWhiteSpace(state) || !allowedStates.Contains(state))
            {
                return BadRequest("Invalid instance state");
            }

            if (language != null && acceptedLanguages.Contains(language.ToLower()))
            {
                languageId = language;
            }

            List<Instance> allInstances = await _instanceRepository.GetInstancesInStateOfInstanceOwner(instanceOwnerId, state);

            if (allInstances == null || allInstances.Count == 0)
            {
                return NotFound($"Did not find any instances for instanceOwnerId={instanceOwnerId}");
            }

            // TODO: authorize instances and filter list

            // get appId from filteredInstances eventually
            List<string> appIds = allInstances.Select(i => i.AppId)
                                    .Distinct()
                                    .ToList();

            // Get title from app metadata
            Dictionary<string, Dictionary<string, string>> appTitles = await _applicationRepository.GetAppTitles(appIds);

            // Simplify instances and return
            List<MessageBoxInstance> messageBoxInstances = InstanceHelper.ConvertToMessageBoxInstance(allInstances, appTitles, languageId);

            return Ok(messageBoxInstances);
        }

        /// <summary>
        /// Gets all instances in a given state for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <param name="language"> language id en, nb, nn-NO"</param>
        /// <returns>list of instances</returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        [Produces("application/vnd+altinn2.inbox+json")]
        public async Task<ActionResult> GetMessageBoxInstance(int instanceOwnerId, Guid instanceGuid, [FromQuery] string language)
        {
            string[] acceptedLanguages = new string[] { "en", "nb", "nn-no" };

            string languageId = "nb";

            if (language != null && acceptedLanguages.Contains(language.ToLower()))
            {
                languageId = language;
            }

            string instanceId = instanceOwnerId.ToString() + "/" + instanceGuid.ToString();

            Instance instance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);

            if (instance == null)
            {
                return NotFound($"Could not find instance {instanceId}");
            }

            // TODO: authorize

            // Get title from app metadata
            Dictionary<string, Dictionary<string, string>> appTitle = await _applicationRepository.GetAppTitles(new List<string> { instance.AppId });

            // Simplify instances and return
            MessageBoxInstance messageBoxInstance = InstanceHelper.ConvertToMessageBoxInstance(new List<Instance>() { instance }, appTitle, languageId).First();

            return Ok(messageBoxInstance);
        }
    }
}
