using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
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
using Microsoft.Extensions.Options;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Controller with functionality for manual testing of services developed
    /// </summary>
    public class ManualTestingController : Controller
    {
        private readonly IProfile _profile;
        private readonly IRegister _register;
        private readonly IAuthorization _authorization;
        private ITestdata _testdata;
        private IExecution _execution;
        private UserHelper _userHelper;
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IGitea _giteaApi;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWorkflow _workflowSI;

        /// <summary>
        /// Initializes a new instance of the <see cref="ManualTestingController"/> class
        /// </summary>
        /// <param name="testdataService">The testDataService (configured in Startup.cs)</param>
        /// <param name="profileService">The profileService (configured in Startup.cs)</param>
        /// <param name="registerService">The registerService (configured in Startup.cs)</param>
        /// <param name="authorizationService">The authorizationService (configured in Startup.cs)</param>        
        /// <param name="repositorySettings">the repository setting service handler</param>
        /// <param name="giteaWrapper">the gitea wrapper handler</param>
        /// <param name="contextAccessor">The http context accessor</param>
        /// <param name="execution">The executionSI</param>
        /// <param name="testdataRepositorySettings">The test data settings</param>
        /// <param name="workflowSI">The workflowSI</param>
        public ManualTestingController(
            ITestdata testdataService,
            IProfile profileService,
            IRegister registerService,
            IAuthorization authorizationService,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IGitea giteaWrapper,
            IExecution execution,
            IHttpContextAccessor contextAccessor,
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IWorkflow workflowSI)
        {
            _testdata = testdataService;
            _profile = profileService;
            _register = registerService;
            _authorization = authorizationService;
            _userHelper = new UserHelper(_profile, _register);
            _settings = repositorySettings.Value;
            _giteaApi = giteaWrapper;
            _execution = execution;
            _httpContextAccessor = contextAccessor;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _workflowSI = workflowSI;
        }

        /// <summary>
        /// This methods list the instances for a given reportee for a service. This can be looked 
        /// at as a simplified message box
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="reporteeId">The reporteeId</param>
        /// <returns>The test message box</returns>
        [Authorize]
        public async Task<IActionResult> Index(string org, string service, int reporteeId)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = _settings.GetRuntimeAPIPath("ZipAndSendRepo", org, service, developer);

            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                HttpResponseMessage response = await client.GetAsync(apiUrl);
                string zipPath = $"{_settings.GetServicePath(org, service, developer)}{service}.zip";
                string extractPath = _settings.GetServicePath(org, service, developer);
                if (!Directory.Exists(extractPath))
                {
                    Directory.CreateDirectory(extractPath);
                }
                else
                {
                    Directory.Delete(extractPath, true);
                    Directory.CreateDirectory(extractPath);
                }

                using (Stream s = response.Content.ReadAsStreamAsync().Result)
                {
                    using (var w = System.IO.File.OpenWrite(zipPath))
                    {
                        s.CopyTo(w);
                    }
                }

                ZipFile.ExtractToDirectory(zipPath, extractPath);
            }

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            var startServiceModel = new StartServiceModel
            {
                ServiceID = org + "_" + service,
                ReporteeList = _authorization.GetReporteeList(requestContext.UserContext.UserId)
                    .Select(x => new SelectListItem { Text = x.ReporteeNumber + " " + x.ReporteeName, Value = x.PartyID.ToString() })
                    .ToList(),
                PrefillList = _testdata.GetServicePrefill(requestContext.Reportee.PartyId, org, service)
                    .Select(x => new SelectListItem { Text = x.PrefillKey + " " + x.LastChanged, Value = x.PrefillKey })
                    .ToList(),
                ReporteeID = requestContext.Reportee.PartyId,
                Org = org,
                Service = service,
            };

            if (reporteeId != 0 && reporteeId != startServiceModel.ReporteeID && startServiceModel.ReporteeList.Any(r => r.Value.Equals(reporteeId.ToString())))
            {
                startServiceModel.ReporteeID = reporteeId;
                requestContext.Reportee = await _register.GetParty(startServiceModel.ReporteeID);
                requestContext.UserContext.ReporteeId = reporteeId;
                requestContext.UserContext.Reportee = requestContext.Reportee;
                HttpContext.Response.Cookies.Append("altinncorereportee", startServiceModel.ReporteeID.ToString());
            }

            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            ViewBag.InstanceList = formInstances.OrderBy(r => r.LastChanged).ToList();

            return View(startServiceModel);
        }

        /// <summary>
        /// Redirects the user to the correct url given the service instances state
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>The test message box</returns>
        [Authorize]
        public async Task<IActionResult> RedirectToCorrectState(string org, string service, Guid instanceId)
        {
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.GetUserContext(HttpContext);
            ServiceState currentState = _workflowSI.GetCurrentState(instanceId, org, service, requestContext.UserContext.ReporteeId);
            string nextUrl = _workflowSI.GetUrlForCurrentState(instanceId, org, service, currentState.State);
            return Redirect(nextUrl);
        }

        /// <summary>
        /// List the test users
        /// </summary>
        /// <param name="returnUrl">The return url to redirect user after login</param>
        /// <returns>The view presenting a list of test users</returns>
        public IActionResult Users(string returnUrl)
        {
            List<Testdata> testdata = _testdata.GetTestUsers();
            ViewBag.ReturnUrl = returnUrl;
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
        /// Method that logs inn test user
        /// </summary>
        /// <param name="id">The testUserId</param>
        /// <param name="returnUrl">The returnUrl to redirect after login</param>
        /// <param name="reportee">The reportee chosen</param>
        /// <returns>Redirects to returnUrl</returns>
        public async Task<IActionResult> LoginTestUser(int id, string returnUrl, string reportee)
        {
            string developer = null;
            if (_settings.ForceGiteaAuthentication)
            {
                // Temporary catch errors until we figure out how to force this.
                try
                {
                    string user = _giteaApi.GetUserNameFromUI().Result;
                    if (string.IsNullOrEmpty(user))
                    {
                        if (Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
                        {
                            return Redirect(Environment.GetEnvironmentVariable("GiteaEndpoint") + "/user/login");
                        }

                        return Redirect(_settings.GiteaLoginUrl);
                    }

                    developer = user;
                }
                catch (Exception ex)
                {
                    return Content(ex.ToString());
                }
            }

            UserProfile profile = await _profile.GetUserProfile(id);
            var claims = new List<Claim>();
            const string Issuer = "https://altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, Issuer));
            if (profile.UserType.Equals(UserType.SSNIdentified))
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.SSN, profile.Party.Person.SSN, ClaimValueTypes.String, Issuer));
            }

            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.Integer32, Issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, profile.PartyId.ToString(), ClaimValueTypes.Integer32, Issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, Issuer));

            if (developer != null)
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.Developer, developer, ClaimValueTypes.String, Issuer));
            }

            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    ExpiresUtc = DateTime.UtcNow.AddMinutes(200),
                    IsPersistent = false,
                    AllowRefresh = false,
                });

            string goToUrl = "/";

            if (!string.IsNullOrEmpty(returnUrl))
            {
                goToUrl = System.Net.WebUtility.UrlDecode(returnUrl);
            }

            List<Reportee> reporteeList = _authorization.GetReporteeList(profile.UserId);

            Reportee reporteeBE = null;

            if (!string.IsNullOrEmpty(reportee) && reporteeList.Any(r => r.ReporteeNumber.Equals(reportee)))
            {
                reporteeBE = reporteeList.FirstOrDefault(r => r.ReporteeNumber.Equals(reportee));
                HttpContext.Response.Cookies.Append("altinncorereportee", reporteeBE.PartyID.ToString());
            }
            else
            {
                HttpContext.Response.Cookies.Append("altinncorereportee", profile.PartyId.ToString());
            }

            return LocalRedirect(goToUrl);
        }
    }
}
