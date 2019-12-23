using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Receipt.Configuration;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.Utils;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// Contains all actions for receipt
    /// </summary>
    [Authorize]
    [ApiController]
    public class ReceiptController : Controller
    {
        private readonly PlatformSettings _platformSettings;
        private readonly HttpClient _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReceiptController"/> class
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        public ReceiptController(IOptions<PlatformSettings> platformSettings, ILogger<ReceiptController> logger)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _client = new HttpClient();
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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
            _logger.LogInformation($"// ReceiptController // GetCurrentUser // Claim count: {Request.HttpContext.User.Claims.Count()}");
            string userIdString = Request.HttpContext.User.Claims.Where(c => c.Type == AltinnCoreClaimTypes.UserId)
           .Select(c => c.Value).SingleOrDefault();

            if (string.IsNullOrEmpty(userIdString))
            {
                return BadRequest("Invalid request context. UserId must be provided in claims.");
            }

            int userId = int.Parse(userIdString);
            string userUrl = string.Empty;
            if (Environment.GetEnvironmentVariable("Platformsettings__ApiProfileEndpoint") != null)
            {
                userUrl = $"{Environment.GetEnvironmentVariable("Platformsettings__ApiProfileEndpoint")}users/{userId}";
            }
            else
            {
                userUrl = $"{_platformSettings.ApiProfileEndpoint}users/{userId}";
            }

            string token = JwtTokenUtil.GetTokenFromContext(Request.HttpContext, "AltinnStudioRuntime");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(userUrl);
            UserProfile userProfile = null;
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                userProfile = await response.Content.ReadAsAsync<UserProfile>();
            }
            else
            {
                _logger.LogError($"Getting user profile with userId {userId} failed with statuscode {response.StatusCode}");
            }

            return Ok(userProfile);
        }
    }
}
