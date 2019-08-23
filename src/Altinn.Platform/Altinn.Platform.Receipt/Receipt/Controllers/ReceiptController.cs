using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.Utils;
using System.Net.Http;
using AltinnCore.ServiceLibrary.Models;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// Contains all actions for receipt
    /// </summary>
    [ApiController]
    public class ReceiptController : Controller
    {
        private HttpClient _client;
        private ILogger _logger;

        public ReceiptController(ILogger<ReceiptController> logger)
        {
            _logger = logger;
            _client = new HttpClient();
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
        [HttpGet]
        [Route("receipt/{instanceOwnerId}/{instanceId}")]
        public IActionResult Index()
        {
            _logger.LogError($"Getting instance");
            return View("receipt");
        }

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

            int userId = int.Parse(userIdString);
            string endpointUrl = $"https://platform.at21.altinn.cloud/profile/api/v1/users/{userId}";
            string token = JwtTokenUtil.GetTokenFromContext(Request.HttpContext, "AltinnStudioRuntime");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            HttpResponseMessage response = await _client.GetAsync(endpointUrl);
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
