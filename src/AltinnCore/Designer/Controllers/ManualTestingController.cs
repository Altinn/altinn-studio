using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller with functionality for manual testing of application developed
    /// </summary>
    [Authorize]
    public class ManualTestingController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IProfile _profile;
        private readonly IRegister _register;
        private readonly UserHelper _userHelper;
        private readonly IAuthorization _authorization;
        private readonly ITestdata _testdata;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private readonly GeneralSettings _generalSettings;
        private readonly IGitea _giteaApi;
        private readonly IWorkflow _workflow;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ManualTestingController"/> class
        /// </summary>
        /// <param name="httpContextAccessor">the http context accessor service</param>
        /// <param name="profile">the profile service</param>
        /// <param name="register">the register service</param>
        /// <param name="authorization">the authorization service</param>
        /// <param name="testdata">the testdata service</param>
        /// <param name="serviceRepositorySettings">the service repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="giteaApi">the gitea api</param>
        /// <param name="workflow">the workflow</param>
        /// <param name="logger">the logger</param>
        public ManualTestingController(
            IHttpContextAccessor httpContextAccessor,
            IProfile profile,
            IRegister register,
            IAuthorization authorization,
            ITestdata testdata,
            IOptions<ServiceRepositorySettings> serviceRepositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IGitea giteaApi,
            IWorkflow workflow,
            ILogger<ManualTestingController> logger)
        {
            _httpContextAccessor = httpContextAccessor;
            _register = register;
            _profile = profile;
            _userHelper = new UserHelper(_profile, _register, generalSettings);
            _authorization = authorization;
            _testdata = testdata;
            _serviceRepositorySettings = serviceRepositorySettings.Value;
            _giteaApi = giteaApi;
            _workflow = workflow;
            _logger = logger;
            _generalSettings = generalSettings.Value;
        }

        /// <summary>
        /// This methods list the instances for a given party for an app. This can be looked
        /// at as a simplified message box
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="partyId">The party id</param>
        /// <param name="userId">The user id</param>
        /// <returns>The test message box</returns>
        [Authorize]
        public async Task<IActionResult> Index(string org, string app, int partyId, int userId)
        {
            if (userId == 0 || partyId == 0)
            {
                return LocalRedirect($"/designer/{org}/{app}/ManualTesting/Users/");
            }

            bool? isValidSelection = await _authorization.ValidateSelectedParty(userId, partyId);

            if (isValidSelection != true)
            {
                return LocalRedirect($"/designer/{org}/{app}/ManualTesting/Users/");
            }

            Response.Cookies.Append(
            _generalSettings.GetAltinnPartyCookieName,
            partyId.ToString(),
            new CookieOptions
            {
                Domain = _generalSettings.HostName
            });

            CheckAndUpdateWorkflowFile(org, app);
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.CreateUserContextBasedOnUserAndParty(HttpContext, userId, partyId);
            requestContext.Party = requestContext.UserContext.Party;

            StartServiceModel startServiceModel = new StartServiceModel
            {
                ServiceID = org + "_" + app,
                PartyList = _authorization.GetPartyList(requestContext.UserContext.UserId)
                    .Select(x => new SelectListItem
                    {
                        Text = (x.PartyTypeName == PartyType.Person) ? x.SSN + " " + x.Name : x.OrgNumber + " " + x.Name,
                        Value = x.PartyId.ToString()
                    })
                    .ToList(),
                PrefillList = _testdata.GetServicePrefill(requestContext.Party.PartyId, org, app)
                    .Select(x => new SelectListItem { Text = x.PrefillKey + " " + x.LastChanged, Value = x.PrefillKey })
                    .ToList(),
                PartyId = requestContext.Party.PartyId,
                Org = org,
                Service = app,
            };

            if (partyId != 0 && partyId != startServiceModel.PartyId && startServiceModel.PartyList.Any(r => r.Value.Equals(partyId.ToString())))
            {
                startServiceModel.PartyId = partyId;
                requestContext.Party = await _register.GetParty(startServiceModel.PartyId);
                requestContext.UserContext.PartyId = partyId;
                requestContext.UserContext.Party = requestContext.Party;
            }

            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Party.PartyId, org, app);
            ViewBag.InstanceList = formInstances.OrderBy(r => r.LastChanged).ToList();

            return View(startServiceModel);
        }

        /// <summary>
        /// List the test users
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The view presenting a list of test users</returns>
        public IActionResult Users(string org, string app)
        {
            List<Testdata> testdata = _testdata.GetTestUsers();
            ViewBag.Org = org;
            ViewBag.App = app;
            return View(testdata);
        }

        /// <summary>
        /// Action to set the language of the test user
        /// </summary>
        /// <param name="culture">The culture to set</param>
        /// <param name="returnUrl">The returnUrl</param>
        /// <returns>Redirect to returnUrl</returns>
        public IActionResult SetLanguage(
            string culture,
            string returnUrl)
        {
            Response.Cookies.Append(
                CookieRequestCultureProvider.DefaultCookieName,
                CookieRequestCultureProvider.MakeCookieValue(new RequestCulture(culture)),
                new CookieOptions { Expires = DateTimeOffset.UtcNow.AddYears(1) });

            return LocalRedirect(returnUrl);
        }

        /// <summary>
        /// Redirects the user to the correct url given the app instance state.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>The test message box</returns>
        [Authorize]
        public IActionResult RedirectToCorrectState(string org, string app, Guid instanceId)
        {
            if (HttpContext.Request.Cookies[_generalSettings.GetAltinnPartyCookieName] != null)
            {
                ServiceState currentState = _workflow.GetCurrentState(instanceId, org, app, Convert.ToInt32(HttpContext.Request.Cookies[_generalSettings.GetAltinnPartyCookieName]));
                string nextUrl = _workflow.GetUrlForCurrentState(instanceId, org, app, currentState.State);
                return Redirect(nextUrl);
            }
            else
            {
                return LocalRedirect($"/designer/{org}/{app}/ManualTesting/Users/");
            }
        }

        /// <summary>
        /// Method that logs inn test user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="userId">The testUserId</param>
        /// <returns>Redirects to returnUrl</returns>
        public async Task<IActionResult> LoginTestUser(string org, string app, int userId)
        {
            UserProfile profile = await _profile.GetUserProfile(userId);
            int partyId = (profile.ProfileSettingPreference != null && profile.ProfileSettingPreference.PreSelectedPartyId != 0) ?
            profile.ProfileSettingPreference.PreSelectedPartyId : profile.PartyId;

            var claims = new List<Claim>();
            const string Issuer = "https://altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, Issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.Integer32, Issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, partyId.ToString(), ClaimValueTypes.Integer32, Issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, Issuer));
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            if (developer != null)
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.Developer, developer, ClaimValueTypes.String, Issuer));
            }

            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string authenticationScheme = JwtCookieDefaults.AuthenticationScheme;

            await HttpContext.SignInAsync(
                    authenticationScheme,
                    principal,
                    new AuthenticationProperties
                    {
                        ExpiresUtc = DateTime.UtcNow.AddMinutes(200),
                        IsPersistent = false,
                        AllowRefresh = false,
                    });

            HttpContext.Response.Cookies.Append("AltinnUserId", profile.UserId.ToString());

            return LocalRedirect($"/designer/{org}/{app}/ManualTesting/Index?userId={userId}&partyId={profile.PartyId}");
        }

        /// <summary>
        /// Method that checks if there is a newer version of the workflow file and updates it if there are
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        private void CheckAndUpdateWorkflowFile(string org, string app)
        {
            string workflowFullFilePath = _serviceRepositorySettings.GetWorkflowPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _serviceRepositorySettings.WorkflowFileName;
            string templateWorkflowData = System.IO.File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);

            if (!System.IO.File.Exists(workflowFullFilePath))
            {
                // Create the workflow folder
                Directory.CreateDirectory(_serviceRepositorySettings.GetWorkflowPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                System.IO.File.WriteAllText(workflowFullFilePath, templateWorkflowData, Encoding.UTF8);
            }
            else
            {
                if (ShouldUpdateFile(workflowFullFilePath, templateWorkflowData))
                {
                    // Overwrite existing file
                    System.IO.File.WriteAllText(workflowFullFilePath, templateWorkflowData, Encoding.UTF8);
                }
            }
        }

        /// <summary>
        /// Method that checks if the workflow file is the latest version
        /// </summary>
        /// <param name="fullPath">The path to the workflow file</param>
        /// <param name="workflowData">The default workflow data</param>
        /// <returns>Boolean that states if the workflow file in the repo is the latest version</returns>
        private bool ShouldUpdateFile(string fullPath, string workflowData)
        {
            string currentworkflowData = System.IO.File.ReadAllText(fullPath, Encoding.UTF8);
            Definitions templateWorkflowModel = null;
            Definitions currentWorkflowModel = null;

            // Getting template version
            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                templateWorkflowModel = (Definitions)serializer.Deserialize(tr);
            }

            // Getting current version
            using (TextReader tr = new StringReader(currentworkflowData))
            {
                currentWorkflowModel = (Definitions)serializer.Deserialize(tr);
            }

            if (templateWorkflowModel != null && currentWorkflowModel != null && templateWorkflowModel.Id != currentWorkflowModel.Id)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    }
}
