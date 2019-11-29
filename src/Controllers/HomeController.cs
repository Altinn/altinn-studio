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

namespace LocalTest.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly GeneralSettings _generalSettings;

        public HomeController(
            ILogger<HomeController> logger,
            IOptions<GeneralSettings> generalSettings)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
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
        public async Task<ActionResult> LogInTestUser(string org, string app, int userId)
        {
            // TODO: read test user data using profile service?
            UserAuthenticationModel userAuthentication = new UserAuthenticationModel()
            {
                UserID = 12345,
                Username = "Test Testesen",
                PartyID = 12345
            };

            List<Claim> claims = new List<Claim>();
            string issuer = "altinn3local.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userAuthentication.Username, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userAuthentication.PartyID.ToString(), ClaimValueTypes.Integer32, issuer));
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

            return Redirect($"{_generalSettings.GetBaseUrl}/{org}/{app}");
        }
    }
}
