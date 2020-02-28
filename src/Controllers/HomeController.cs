using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LocalTest.Models;
using Microsoft.AspNetCore.Authorization;
using AltinnCore.Authentication.Constants;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using AltinnCore.Authentication.JwtCookie;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Interface.Models;
using System.IO;
using LocalTest.Services.Profile.Interface;
using Microsoft.AspNetCore.Mvc.Rendering;
using Altinn.Platform.Profile.Models;

namespace LocalTest.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly GeneralSettings _generalSettings;
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IUserProfiles _userProfileService;
        private readonly JwtCookieHandler jwtHandler;

        public HomeController(
            ILogger<HomeController> logger,
            IOptions<GeneralSettings> generalSettings,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IApplicationRepository applicationRepository,
            IUserProfiles userProfileService,
            JwtCookieHandler jwtHandler)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            this._localPlatformSettings = localPlatformSettings.Value;
            this._applicationRepository = applicationRepository;
            this._userProfileService = userProfileService;
            this.jwtHandler = jwtHandler;
        }

        [AllowAnonymous]
        public async Task<IActionResult> Index()
        {
            StartAppModel model = new StartAppModel();
            Application app = this._applicationRepository.FindOne("", "").Result;
            model.TestUsers = await GetTestUsersForList();
            model.AppPath = _localPlatformSettings.AppRepsitoryBasePath;
            model.StaticTestDataPath = _localPlatformSettings.LocalTestingStaticTestDataPath;

            if (app == null)
            {
                model.InvalidAppPath = true;
            }

            if (model.TestUsers.Count() == 0)
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="userId">The testUserId</param>
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

            DateTime later = DateTime.UtcNow.AddMinutes(int.Parse(_generalSettings.GetJwtCookieValidityTime));

            await HttpContext.SignInAsync(
                JwtCookieDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    ExpiresUtc = later,
                    IsPersistent = false,
                    AllowRefresh = false,
                });

            Application app = this._applicationRepository.FindOne("", "").Result;

            return Redirect($"{_generalSettings.GetBaseUrl}/{app.Org}/{app.Id.Split("/")[1]}");
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="userId"></param>
        /// <returns></returns>
        public async Task<ActionResult> GetTestUserToken(int id)
        {
            UserProfile profile = await _userProfileService.GetUser(id);

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

            DateTime later = DateTime.UtcNow.AddMinutes(int.Parse(_generalSettings.GetJwtCookieValidityTime));
            // Create a test token with long duration
            string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(1337), 0)).Result;
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

            DateTime later = DateTime.UtcNow.AddMinutes(int.Parse(_generalSettings.GetJwtCookieValidityTime));
            // Create a test token with long duration
            string token = await jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(1337), 0));

            return Ok(token);
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

            foreach(string file in files)
            {
                int userId = 0;

                if(int.TryParse(Path.GetFileNameWithoutExtension(file), out userId))
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

            foreach(UserProfile profile in users)
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
    }
}
