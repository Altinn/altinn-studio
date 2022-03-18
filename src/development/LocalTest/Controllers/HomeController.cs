using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Xml;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Options;

using AltinnCore.Authentication.Constants;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.LocalApp.Interface;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace LocalTest.Controllers
{
    public class HomeController : Controller
    {
        private readonly GeneralSettings _generalSettings;
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IUserProfiles _userProfileService;
        private readonly IAuthentication _authenticationService;
        private readonly ILocalApp _localApp;

        public HomeController(
            IOptions<GeneralSettings> generalSettings,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IUserProfiles userProfileService,
            IAuthentication authenticationService,
            ILocalApp localApp)
        {
            _generalSettings = generalSettings.Value;
            _localPlatformSettings = localPlatformSettings.Value;
            _userProfileService = userProfileService;
            _authenticationService = authenticationService;
            _localApp = localApp;
        }

        [AllowAnonymous]
        public async Task<IActionResult> Index()
        {
            StartAppModel model = new StartAppModel();
            try
            {
                model.TestApps = await GetAppsList();
            }
            catch (HttpRequestException e)
            {
                model.HttpException = e;
            }

            model.TestUsers = await GetTestUsersForList();
            model.AppPath = _localPlatformSettings.AppRepositoryBasePath;
            model.StaticTestDataPath = _localPlatformSettings.LocalTestingStaticTestDataPath;
            model.LocalAppUrl = _localPlatformSettings.LocalAppUrl;
            var defaultAuthLevel = _localPlatformSettings.LocalAppMode == "http" ? await GetAppAuthLevel(model.TestApps) : 2;
            model.AuthenticationLevels = GetAuthenticationLevels(defaultAuthLevel);

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

        public IActionResult Privacy()
        {
            return View();
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
        public async Task<ActionResult> LogInTestUser(StartAppModel startAppModel)
        {
            UserProfile profile = await _userProfileService.GetUser(startAppModel.UserId);

            List<Claim> claims = new List<Claim>();
            string issuer = _generalSettings.Hostname;
            claims.Add(new Claim(ClaimTypes.NameIdentifier, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, profile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, startAppModel.AuthenticationLevel, ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            string token = _authenticationService.GenerateToken(principal, int.Parse(_generalSettings.GetJwtCookieValidityTime));
            CreateJwtCookieAndAppendToResponse(token);

            Application app = await _localApp.GetApplicationMetadata(startAppModel.AppPathSelection);

            return Redirect($"{_generalSettings.GetBaseUrl}/{app.Id}/");
        }

        /// <summary>
        ///
        /// </summary>
        /// <param name="userId"></param>
        /// <returns></returns>
        public async Task<ActionResult> GetTestUserToken(int userId)
        {
            UserProfile profile = await _userProfileService.GetUser(userId);

            if (profile == null)
            {
                return NotFound();
            }

            List<Claim> claims = new List<Claim>();
            string issuer = _generalSettings.Hostname;
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, profile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            // Create a test token with long duration
            string token = _authenticationService.GenerateToken(principal, 1337);
            return Ok(token);
        }

        /// <summary>
        /// Returns a org token with the given org as claim
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public async Task<ActionResult> GetTestOrgToken(string id, [FromQuery] string orgNumber = "")
        {
            List<Claim> claims = new List<Claim>();
            string issuer = _generalSettings.Hostname;
            claims.Add(new Claim(AltinnCoreClaimTypes.Org, id.ToLower(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim("urn:altinn:scope", "altinn:serviceowner/instances.read", ClaimValueTypes.String, issuer));
            if (!string.IsNullOrEmpty(orgNumber))
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.String, issuer));
            }

            ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            // Create a test token with long duration
            string token = _authenticationService.GenerateToken(principal, 1337);

            return await Task.FromResult(Ok(token));
        }

        private async Task<List<UserProfile>> GetTestUsers()
        {
            List<UserProfile> users = new List<UserProfile>();
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Profile/User/";

            if (!Directory.Exists(path))
            {
                return users;
            }

            string[] files = Directory.GetFiles(path, "*.json");

            foreach (string file in files)
            {
                if (int.TryParse(Path.GetFileNameWithoutExtension(file), out int userId))
                {
                    users.Add(await _userProfileService.GetUser(userId));
                }
            }

            return users;
        }

        private async Task<IEnumerable<SelectListItem>> GetTestUsersForList()
        {
            List<UserProfile> users = await GetTestUsers();

            List<SelectListItem> userItems = new List<SelectListItem>();

            foreach (UserProfile profile in users)
            {
                SelectListItem item = new SelectListItem()
                {
                    Value = profile.UserId.ToString(),
                    Text = profile.Party.Person.Name
                };

                userItems.Add(item);
            }

            return userItems;
        }
        private async Task<int> GetAppAuthLevel(IEnumerable<SelectListItem> testApps)
        {
            try {
                var appId = testApps.Single().Value;
                var policyString = await _localApp.GetXACMLPolicy(appId);
                var document = new XmlDocument();
                document.LoadXml(policyString);
                var nsMngr = new XmlNamespaceManager(document.NameTable);
                nsMngr.AddNamespace("xacml", "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17");
                var authLevelNode = document.SelectSingleNode("/xacml:Policy/xacml:ObligationExpressions/xacml:ObligationExpression[@ObligationId='urn:altinn:obligation:authenticationLevel1']/xacml:AttributeAssignmentExpression[@Category='urn:altinn:minimum-authenticationlevel']/xacml:AttributeValue", nsMngr);
                return int.Parse(authLevelNode.InnerText);
            }
            catch(Exception)
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
        private void CreateJwtCookieAndAppendToResponse(string cookieValue)
        {
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

            ICookieManager cookieManager = new ChunkingCookieManager();
            cookieManager.AppendResponseCookie(
                HttpContext,
                cookieBuilder.Name,
                cookieValue,
                cookieOptions);
        }
    }
}
