using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ServiceLibrary.Models;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Handles party related operations
    /// </summary>
    [Authorize]
    [ApiController]
    public class PartiesController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IAuthorization _authorization;
        private readonly UserHelper _userHelper;
        private readonly IRepository _repository;
        private readonly IProfile _profile;
        private readonly GeneralSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesController"/> class
        /// <param name="logger">The logger</param>
        /// <param name="authorization">the authorization service handler</param>
        /// <param name="profileService">the profile service</param>
        /// <param name="registerService">the register service</param>
        /// <param name="repository">The repository service</param>
        /// <param name="settings">The general settings</param>
        /// </summary>
        public PartiesController(
                    ILogger<PartiesController> logger,
                    IAuthorization authorization,
                    IProfile profileService,
                    IRegister registerService,
                    IRepository repository,
                    IOptions<GeneralSettings> settings)
        {
            _logger = logger;
            _authorization = authorization;
            _userHelper = new UserHelper(profileService, registerService, settings);
            _repository = repository;
            _profile = profileService;            
        }

        /// <summary>
        /// Gets the list of parties the user can represent
        /// </summary>
        /// <returns></returns>
        [HttpGet("{org}/{app}/api/v1/parties")]
        public IActionResult Get()
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext).Result;
            List<Party> partyList = _authorization.GetPartyList(userContext.UserId);
            return Ok(partyList);
        }

        /// <summary>
        /// Validates party and profile settings before the end user is allowed to instantiate a new app instance
        /// </summary>
        /// <param name="org">The organization<param>
        /// <param name="app">The application<param>
        /// <param name="partyId">The selected partyId<param>
        /// <returns>A validation status</returns>
        [HttpPost("{org}/{app}/api/v1/parties/validateInstantiation")]
        public IActionResult ValidateInstantiation(string org, string app, [FromQuery] int partyId)
        {
            UserContext userContext = _userHelper.GetUserContext(HttpContext).Result;
            UserProfile user = _profile.GetUserProfile(userContext.UserId).Result;
            List<Party> partyList = _authorization.GetPartyList(userContext.UserId);
            Application application = _repository.GetApplication(org, app);

            if (application == null)
            {
                return NotFound("Application not found");
            }

            PartyTypesAllowed partyTypesAllowed = application.PartyTypesAllowed;
            Party partyUserRepresents = null;
            List<Party> allowedPartiesTheUserCanRepresent = new List<Party>();

            // Check if the user can represent the supplied partyId
            if (partyId != user.PartyId)
            {
                Party represents = InstantiationHelper.GetPartyByPartyId(partyList, partyId);
                if (represents == null)
                {
                    // the user does not represent the chosen party id, is not allowed to initiate
                    return Ok(new InstantiationValidationResult
                    {
                        Valid = false,
                        Message = "The user does not represent the supplied party",
                        ValidParties = InstantiationHelper.FilterPartiesByAllowedPartyTypes(partyList, partyTypesAllowed)
                    });
                }

                partyUserRepresents = represents;
            }

            if (partyUserRepresents == null)
            {
                // if not set, the user represents itself
                partyUserRepresents = user.Party;
            }

            // Check if the application can be initiated with the party chosen
            bool canInstantiate = InstantiationHelper.IsPartyAllowedToInstantiate(partyUserRepresents, partyTypesAllowed);

            if (!canInstantiate)
            {
                return Ok(new InstantiationValidationResult
                {
                    Valid = false,
                    Message = "The supplied party is not allowed to instantiate the application",
                    ValidParties = InstantiationHelper.FilterPartiesByAllowedPartyTypes(partyList, partyTypesAllowed)
                });
            }

            return Ok(new InstantiationValidationResult
            {
                Valid = true,
            });
        }
    }
}
