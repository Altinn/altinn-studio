using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Handles party related operations
    /// </summary>
    [Authorize]
    public class PartiesController : Controller
    {
        private readonly ILogger _logger;
        private readonly IAuthorization _authorization;
        private readonly UserHelper _userHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class
        /// <param name="logger">The logger</param>
        /// <param name="authorization">the authorization service handler</param>
        /// <param name="profileService">the profile service</param>
        /// <param name="registerService">the register service</param>
        /// <param name="userHelper">the user helper</param>
        /// </summary>
        public PartiesController(
                    ILogger<PartiesController> logger,
                    IAuthorization authorization,
                    IProfile profileService,
                    IRegister registerService)
        {
            _logger = logger;
            _authorization = authorization;
            _userHelper = new UserHelper(profileService, registerService);
        }

        /// <summary>
        /// Gets the lsit of parties the user can represent
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public IActionResult Get()
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext).Result;
            List<Party> partyList = _authorization.GetPartyList(userContext.UserId);
            return Ok(partyList);
        }
    }
}
