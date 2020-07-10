using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using AltinnCore.Authentication.Constants;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Profile.Interface;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authentication.Cookies;


namespace LocalTest.Controllers
{
    public class HomeController : Controller
    {
        private readonly GeneralSettings _generalSettings;
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IUserProfiles _userProfileService;
        private readonly IAuthentication _authenticationService;

        public HomeController(
            IOptions<GeneralSettings> generalSettings,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IApplicationRepository applicationRepository,
            IUserProfiles userProfileService,
            IAuthentication authenticationService)
        {
            _generalSettings = generalSettings.Value;
            _localPlatformSettings = localPlatformSettings.Value;
            _applicationRepository = applicationRepository;
            _userProfileService = userProfileService;
            _authenticationService = authenticationService;
        }

        [AllowAnonymous]
        public async Task<IActionResult> Index()
        {
            StartAppModel model = new StartAppModel();
            Application app = await _applicationRepository.FindOne("", "");
            model.TestUsers = await GetTestUsersForList();
            model.AppPath = _localPlatformSettings.AppRepsitoryBasePath;
            model.StaticTestDataPath = _localPlatformSettings.LocalTestingStaticTestDataPath;

            if (app == null)
            {
                model.InvalidAppPath = true;
            }

            if (!model.TestUsers.Any())
            {
                model.InvalidTestDataPath = true;
            }

            if (app != null)
            {
                model.Org = app.Org;
                model.App = app.Id.Split("/")[1];
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
            string issuer = "altinn3local.no";
            claims.Add(new Claim(ClaimTypes.NameIdentifier, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, profile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            string token = _authenticationService.GenerateToken(principal, int.Parse(_generalSettings.GetJwtCookieValidityTime));
            CreateJwtCookieAndAppendToResponse(token);

            Application app = await _applicationRepository.FindOne("", "");

            return Redirect($"{_generalSettings.GetBaseUrl}/{app.Org}/{app.Id.Split("/")[1]}");
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
            string issuer = "altinn3local.no";
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
        public async Task<ActionResult> GetTestOrgToken(string id)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "altinn3local.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.Org, id.ToLower(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));

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
                int userId;

                if (int.TryParse(Path.GetFileNameWithoutExtension(file), out userId))
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

        /// <summary>
        /// Creates a session cookie meant to be used to hold the generated JSON Web Token and appends it to the response.
        /// </summary>
        /// <param name="cookieValue">The cookie value.</param>
        private void CreateJwtCookieAndAppendToResponse(string cookieValue)
        {
            CookieBuilder cookieBuilder = new RequestPathBaseCookieBuilder
            {
                Name = "AltinnStudioRuntime",
                SameSite = SameSiteMode.None,
                HttpOnly = true,
                SecurePolicy = CookieSecurePolicy.None,
                IsEssential = true,
                Domain = _generalSettings.HostName,
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
