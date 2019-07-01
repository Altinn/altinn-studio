using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Handles party related operations
    /// </summary>
    public class PartyController : Controller
    {
        private readonly ILogger _logger;
        private readonly IAuthorization _authorization;
        private readonly UserHelper _userHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartyController"/> class
        /// <param name="logger">The logger</param>
        /// <param name="authorization">the authorization service handler</param>
        /// <param name="userHelper">helper class to get user context</param>
        /// </summary>
        public PartyController(
                    ILogger<PartyController> logger,
                    IAuthorization authorization,
                    UserHelper userHelper)
        {
            _logger = logger;
            _authorization = authorization;
            _userHelper = userHelper;
        }

        /// <summary>
        /// Gets the lsit of parties the user can represent
        /// </summary>
        /// <returns></returns>
        [Authorize]
        [HttpGet]
        public IActionResult Index()
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext).Result;
            List<Party> partyList = _authorization.GetPartyList(userContext.UserId);
            return Ok(partyList);
        }
    }
}
