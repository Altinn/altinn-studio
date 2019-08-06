using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Exposes API endpoints related to authorization
    /// </summary>
    public class AuthorizationController : Controller
    {
        private readonly IAuthorization _authroization;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationController"/> class
        /// </summary>
        public AuthorizationController(IAuthorization authorization, ILogger<AuthorizationController> logger)
        {
            _authroization = authorization;
            _logger = logger;
        }

        /// <summary>
        /// This is the HttpPost version of the CompleteAndSendIn operation that
        /// is triggered when user press the send in option.
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <param name="partyId">The partyId</param>
        /// <returns>Redirect user to the receipt page.</returns>
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> ValidateSelectedParty(int userId, int partyId)
        {
            if (partyId == 0 || userId == 0)
            {
                return BadRequest("Both userId and partyId must be provided.");
            }

            bool? result = await _authroization.ValidateSelectedParty(userId, partyId);

            if (result != null)
            {
                return Ok(result);
            }
            else
            {
                return StatusCode(500, $"Something went wrong when trying to validate party {partyId} for user {userId}");
            }
        }
    }
}
