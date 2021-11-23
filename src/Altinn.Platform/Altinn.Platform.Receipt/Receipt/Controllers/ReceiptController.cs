using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Receipt.Helpers;
using Altinn.Platform.Receipt.Model;
using Altinn.Platform.Receipt.Services.Interfaces;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// Contains all actions for receipt
    /// </summary>
    [Authorize]
    [ApiController]
    public class ReceiptController : Controller
    {
        private readonly IRegister _register;
        private readonly IStorage _storage;
        private readonly IProfile _profile;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReceiptController"/> class
        /// </summary>
        /// <param name="register">the register service</param>
        /// <param name="storage">the storage service</param>
        /// <param name="profile">the profile service</param>
        /// <param name="logger">the logger</param>
        public ReceiptController(
            IRegister register,
            IStorage storage,
            IProfile profile,
            ILogger<ReceiptController> logger)
        {
            _register = register;
            _storage = storage;
            _profile = profile;
            _logger = logger;
        }

        /// <summary>
        /// Gets the receipt frontend view
        /// </summary>
        /// <param name="instanceOwnerId">The instance owner id </param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>The receipt frontend</returns>
        [HttpGet]
        [Route("receipt/{instanceOwnerId}/{instanceId}")]
        public IActionResult Index(int instanceOwnerId, Guid instanceId)
        {
            _logger.LogInformation($"Getting receipt for: {instanceOwnerId} for instance with id: {instanceId} ");
            return View("receipt");
        }

        /// <summary>
        /// Gets the user profile of the currently logged in user
        /// </summary>
        /// <returns>The user profile</returns>
        [HttpGet]
        [Route("receipt/api/v1/users/current")]
        public async Task<IActionResult> GetCurrentUser()
        {
            string userIdString = Request.HttpContext.User.Claims.Where(c => c.Type == AltinnCoreClaimTypes.UserId)
           .Select(c => c.Value).SingleOrDefault();

            if (string.IsNullOrEmpty(userIdString))
            {
                return BadRequest("Invalid request context. UserId must be provided in claims.");
            }

            try
            {
                int userId = int.Parse(userIdString);
                UserProfile profile = await _profile.GetUser(userId);
                return Ok(profile);
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e);
            }
        }

        /// <summary>
        /// Gets instance metadata with option to include instance owner party object
        /// </summary>
        /// <returns>An extended instance including instance metadata and potentially party data.</returns>
        [HttpGet]
        [Route("receipt/api/v1/instances/{instanceOwnerId}/{instanceGuid}")]
        public async Task<ActionResult> GetInstanceIncludeParty(int instanceOwnerId, Guid instanceGuid, bool includeParty = false)
        {
            ExtendedInstance result = new ExtendedInstance();

            try
            {
                Instance instance = await _storage.GetInstance(instanceOwnerId, instanceGuid);
                result.Instance = instance;
            }
            catch (PlatformHttpException e)
            {
                return HandlePlatformHttpException(e);
            }

            string partyId = result?.Instance?.InstanceOwner?.PartyId;
            if (includeParty && partyId != null && int.TryParse(partyId, out int partyIdInt))
            {
                try
                {
                    Party party = await _register.GetParty(partyIdInt);
                    result.Party = party;
                }
                catch (PlatformHttpException e)
                {
                    return HandlePlatformHttpException(e);
                }
            }

            return Ok(result);
        }

        private ActionResult HandlePlatformHttpException(PlatformHttpException e)
        {
            if (e.Response.StatusCode == HttpStatusCode.Unauthorized)
            {
                return StatusCode(401, e.Message);
            }
            else if (e.Response.StatusCode == HttpStatusCode.Forbidden)
            {
                return StatusCode(403, e.Message);
            }
            else if (e.Response.StatusCode == HttpStatusCode.NotFound)
            {
                return StatusCode(404, e.Message);
            }
            else
            {
                return StatusCode(500, e.Message);
            }
        }
    }
}
