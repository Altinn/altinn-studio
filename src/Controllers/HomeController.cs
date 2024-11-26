using System.Diagnostics;
using System.Xml;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Options;

using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.LocalApp.Interface;

using Microsoft.AspNetCore.Authentication.Cookies;
using LocalTest.Services.TestData;

namespace LocalTest.Controllers
{
    [Route("/Home/[action]")]
    public class HomeController : Controller
    {
        private readonly GeneralSettings _generalSettings;
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IUserProfiles _userProfileService;
        private readonly IAuthentication _authenticationService;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IParties _partiesService;

        private readonly ILocalApp _localApp;
        private readonly TestDataService _testDataService;

        public HomeController(
            IOptions<GeneralSettings> generalSettings,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IUserProfiles userProfileService,
            IAuthentication authenticationService,
            IApplicationRepository applicationRepository,
            IParties partiesService,
            ILocalApp localApp,
            TestDataService testDataService)
        {
            _generalSettings = generalSettings.Value;
            _localPlatformSettings = localPlatformSettings.Value;
            _userProfileService = userProfileService;
            _authenticationService = authenticationService;
            _applicationRepository = applicationRepository;
            _partiesService = partiesService;
            _localApp = localApp;
            _testDataService = testDataService;
        }

        [AllowAnonymous]
        [HttpGet("/")]
        [HttpGet("/Home")]
        [HttpGet("/Home/Index")]
        public async Task<IActionResult> Index()
        {
            StartAppModel model = new StartAppModel()
            {
                AppModeIsHttp = _localPlatformSettings.LocalAppMode == "http",
                AppPath = _localPlatformSettings.AppRepositoryBasePath,
                StaticTestDataPath = _localPlatformSettings.LocalTestingStaticTestDataPath,
                LocalAppUrl = _localPlatformSettings.LocalAppUrl,
                LocalFrontendUrl = HttpContext.Request.Cookies[FrontendVersionController.FRONTEND_URL_COOKIE_NAME],
            };

            try
            {
                model.TestApps = await GetAppsList();
                if (model.AppModeIsHttp)
                {
                    model.Org = model.TestApps[0].Value?.Split("/").FirstOrDefault();
                    model.App = model.TestApps[0].Value?.Split("/").LastOrDefault();
                }
                model.TestUsers = await GetTestUsersForList();
                model.UserSelect = Request.Cookies["Localtest_User.Party_Select"];
                var defaultAuthLevel = await GetAppAuthLevel(model.AppModeIsHttp, model.TestApps);
                model.AuthenticationLevels = GetAuthenticationLevels(defaultAuthLevel);
            }
            catch (HttpRequestException e)
            {
                model.HttpException = e;
            }


            if (!model.TestApps?.Any() ?? true)
            {
                model.InvalidAppPath = true;
            }

            if (!model.TestUsers?.Any() ?? true)
            {
                model.InvalidTestDataPath = true;
            }

            return View(model);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        /// <summary>
        /// Method that logs inn test user
        /// </summary>
        /// <param name="startAppModel">An object with information about app and user.</param>
        /// <returns>Redirects to returnUrl</returns>
        [HttpPost]
        public async Task<ActionResult> LogInTestUser(string action, StartAppModel startAppModel)
        {
            if (startAppModel.AuthenticationLevel != "-1")
            {
                UserProfile profile = await _userProfileService.GetUser(startAppModel.UserId);
                int authenticationLevel = Convert.ToInt32(startAppModel.AuthenticationLevel);

                string token = await _authenticationService.GenerateTokenForProfile(profile, authenticationLevel);
                CreateJwtCookieAndAppendToResponse(token, startAppModel.PartyId, startAppModel.UserSelect);
            }

            if (action.Equals("reauthenticate"))
            {
                return NoContent();
            }

            if (startAppModel.AppPathSelection?.Equals("accessmanagement") == true)
            {
                return Redirect($"/accessmanagement/ui/given-api-delegations/overview");
            }

            Application app = await _localApp.GetApplicationMetadata(startAppModel.AppPathSelection);

            // Ensure that the documentstorage in LocalTestingStorageBasePath is updated with the most recent app data
            await _applicationRepository.Update(app);

            if (_localPlatformSettings.LocalAppMode == "http")
            {
                // Instantiate a prefill if a file attachment exists.
                var prefill = Request.Form.Files.FirstOrDefault();
                if (prefill != null)
                {
                    var instance = new Instance
                    {
                        AppId = app.Id,
                        Org = app.Org,
                        InstanceOwner = new()
                        {
                            PartyId = startAppModel.PartyId.ToString(),
                        },
                        DataValues = new()
                        {
                            { "PrefillFilename", prefill.FileName }
                        },
                    };

                    var xmlDataId = app.DataTypes.First(dt => dt.AppLogic is not null).Id;

                    using var reader = new StreamReader(prefill.OpenReadStream());
                    var content = await reader.ReadToEndAsync();
                    var token = await _authenticationService.GenerateTokenForOrg(app.Id.Split("/")[0]);
                    var newInstance = await _localApp.Instantiate(app.Id, instance, content, xmlDataId, token);

                    return Redirect($"/{app.Id}/#/instance/{newInstance.Id}");
                }
            }

            return Redirect($"/{app.Id}/");
        }

        /// <summary>
        ///
        /// </summary>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpGet("{userId}")]
        public async Task<ActionResult> GetTestUserToken(int userId)
        {
            UserProfile profile = await _userProfileService.GetUser(userId);

            if (profile == null)
            {
                return NotFound();
            }

            // Create a test token with long duration
            string token = await _authenticationService.GenerateTokenForProfile(profile, 2);
            return Ok(token);
        }

        /// <summary>
        /// Returns a org token with the given org as claim
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        public async Task<ActionResult> GetTestOrgToken(string id, [FromQuery] string orgNumber = null, [FromQuery] string scopes = null)
        {
            // Create a test token with long duration
            string token = await _authenticationService.GenerateTokenForOrg(id, orgNumber, scopes);

            return Ok(token);
        }

        private async Task<IEnumerable<SelectListItem>> GetTestUsersForList()
        {
            var data = await _testDataService.GetTestData();
            var userItems = new List<SelectListItem>();

            foreach (UserProfile profile in data.Profile.User.Values)
            {
                var properProfile = await _userProfileService.GetUser(profile.UserId);

                var userParties = await _partiesService.GetParties(properProfile.UserId);

                if (userParties.Count == 1 && userParties.First().PartyId == properProfile.PartyId)
                {
                    // Don't add singe party users to a group
                    var party = userParties.First();
                    userItems.Add(new()
                    {
                        Value = properProfile.UserId + "." + party.PartyId,
                        Text = party.Name,
                    });
                }
                else
                {
                    // When a user represents multiple parties, add it to a group, so that it stands out visually
                    var group = new SelectListGroup()
                    {
                        Name = properProfile.Party.Name,
                    };
                    foreach (var party in userParties)
                    {
                        userItems.Add(new()
                        {
                            Value = properProfile.UserId + "." + party.PartyId,
                            Text = $"{party.Name} ({party.PartyTypeName})",
                            Group = group,
                        });
                    }
                }
            }

            return userItems;
        }

        private async Task<int> GetAppAuthLevel(bool isHttp, IEnumerable<SelectListItem> testApps)
        {
            if (!isHttp)
            {
                return 2;
            }
            try
            {
                var appId = testApps.Single().Value;
                var policyString = await _localApp.GetXACMLPolicy(appId);
                var document = new XmlDocument();
                document.LoadXml(policyString);
                var nsMngr = new XmlNamespaceManager(document.NameTable);
                nsMngr.AddNamespace("xacml", "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17");
                var authLevelNode = document.SelectSingleNode("/xacml:Policy/xacml:ObligationExpressions/xacml:ObligationExpression[@ObligationId='urn:altinn:obligation:authenticationLevel1']/xacml:AttributeAssignmentExpression[@Category='urn:altinn:minimum-authenticationlevel']/xacml:AttributeValue", nsMngr);
                return int.Parse(authLevelNode.InnerText);
            }
            catch (Exception)
            {
                // Return default auth level if Single app auth level can't be found.
                return 2;
            }
        }

        private List<SelectListItem> GetAuthenticationLevels(int defaultAuthLevel)
        {
            return new()
            {
                new()
                {
                    Value = "-1",
                    Text = "Ikke autentisert",
                    Selected = defaultAuthLevel == -1
                },
                new()
                {
                    Value = "0",
                    Text = "Nivå 0",
                    Selected = defaultAuthLevel == 0
                },
                new()
                {
                    Value = "1",
                    Text = "Nivå 1",
                    Selected = defaultAuthLevel == 1
                },
                new()
                {
                    Value = "2",
                    Text = "Nivå 2",
                    Selected = defaultAuthLevel == 2
                },
                new()
                {
                    Value = "3",
                    Text = "Nivå 3",
                    Selected = defaultAuthLevel == 3
                },
                new()
                {
                    Value = "4",
                    Text = "Nivå 4",
                    Selected = defaultAuthLevel == 4
                },
            };
        }

        private async Task<List<SelectListItem>> GetAppsList()
        {
            var applications = await _localApp.GetApplications();
            return applications.Select((kv) => GetSelectItem(kv.Value, kv.Key)).ToList();
        }

        private static SelectListItem GetSelectItem(Application app, string path)
        {
            SelectListItem item = new SelectListItem() { Value = path, Text = app.Title.GetValueOrDefault("nb") };
            return item;
        }

        /// <summary>
        /// Creates a session cookie meant to be used to hold the generated JSON Web Token and appends it to the response.
        /// </summary>
        /// <param name="cookieValue">The cookie value.</param>
        private void CreateJwtCookieAndAppendToResponse(string identityCookie, int altinnPartyId, string userSelect)
        {
            ICookieManager cookieManager = new ChunkingCookieManager();

            // Add cookie proving the users identity
            CookieBuilder cookieBuilder = new RequestPathBaseCookieBuilder
            {
                Name = "AltinnStudioRuntime",
                SameSite = SameSiteMode.Lax,
                HttpOnly = true,
                SecurePolicy = CookieSecurePolicy.None,
                IsEssential = true,
                Domain = _generalSettings.Hostname,
                Expiration = new TimeSpan(0, 1337, 0)
            };
            CookieOptions cookieOptions = cookieBuilder.Build(HttpContext);
            cookieManager.AppendResponseCookie(
                HttpContext,
                cookieBuilder.Name,
                identityCookie,
                cookieOptions);

            // Add cookie about users prefered party (for creating new instances)
            CookieBuilder partyCookieBuilder = new RequestPathBaseCookieBuilder
            {
                Name = "AltinnPartyId",
                SameSite = SameSiteMode.Lax,
                HttpOnly = false,
                SecurePolicy = CookieSecurePolicy.None,
                IsEssential = true,
                Domain = _generalSettings.Hostname,
                MaxAge = TimeSpan.FromDays(365),
            };
            CookieOptions partyCookieOptions = partyCookieBuilder.Build(HttpContext);
            cookieManager.AppendResponseCookie(
                HttpContext,
                partyCookieBuilder.Name,
                altinnPartyId.ToString(),
                partyCookieOptions);

            // Add cookie about users selection (for preselecting in the dropdown)
            CookieBuilder userSelectCookieBuilder = new RequestPathBaseCookieBuilder
            {
                Name = "Localtest_User.Party_Select",
                SameSite = SameSiteMode.Lax,
                HttpOnly = false,
                SecurePolicy = CookieSecurePolicy.None,
                IsEssential = true,
                Domain = _generalSettings.Hostname,
                MaxAge = TimeSpan.FromDays(365),
            };
            CookieOptions userSelectCookieOptions = cookieBuilder.Build(HttpContext);
            cookieManager.AppendResponseCookie(
                HttpContext,
                userSelectCookieBuilder.Name,
                userSelect,
                userSelectCookieOptions);
        }
    }
}
