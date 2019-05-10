using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
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
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller with functionality for manual testing of applicaiton developed
    /// </summary>
    [Authorize]
    public class ManualTestingController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IExecution _execution;
        private readonly IProfile _profile;
        private readonly IRegister _register;
        private readonly UserHelper _userHelper;
        private readonly IAuthorization _authorization;
        private readonly ITestdata _testdata;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private readonly GeneralSettings _generalSettings;
        private readonly IGitea _giteaApi;
        private readonly IWorkflow _workflow;

        /// <summary>
        /// Initializes a new instance of the <see cref="ManualTestingController"/> class
        /// </summary>
        /// <param name="httpContextAccessor">the http context accessor service</param>
        /// <param name="execution">the execution service</param>
        /// <param name="profile">the profile service</param>
        /// <param name="register">the register service</param>
        /// <param name="authorization">the authorization service</param>
        /// <param name="testdata">the testdata service</param>
        /// <param name="serviceRepositorySettings">the service repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="giteaApi">the gitea api</param>
        /// <param name="workflow">the workflow</param>
        public ManualTestingController(IHttpContextAccessor httpContextAccessor, IExecution execution, IProfile profile, IRegister register, IAuthorization authorization, ITestdata testdata, IOptions<ServiceRepositorySettings> serviceRepositorySettings, IOptions<GeneralSettings> generalSettings, IGitea giteaApi, IWorkflow workflow)
        {
            _httpContextAccessor = httpContextAccessor;
            _execution = execution;
            _register = register;
            _profile = profile;
            _userHelper = new UserHelper(_profile, _register);
            _authorization = authorization;
            _testdata = testdata;
            _serviceRepositorySettings = serviceRepositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _giteaApi = giteaApi;
            _workflow = workflow;
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
            if (reporteeId == 0)
            {
                return LocalRedirect($"/designer/{org}/{service}/ManualTesting/Users/");
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            _execution.CheckAndUpdateWorkflowFile(org, service, developer);
            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await _userHelper.CreateUserContextBasedOnReportee(HttpContext, reporteeId);
            requestContext.Reportee = requestContext.UserContext.Reportee;

            StartServiceModel startServiceModel = new StartServiceModel
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

            List<ServiceInstance> formInstances = _testdata.GetFormInstances(requestContext.Reportee.PartyId, org, service);
            ViewBag.InstanceList = formInstances.OrderBy(r => r.LastChanged).ToList();

            return View(startServiceModel);
        }

        /// <summary>
        /// List the test users
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The view presenting a list of test users</returns>
        public IActionResult Users(string org, string service)
        {
            List<Testdata> testdata = _testdata.GetTestUsers();
            ViewBag.Org = org;
            ViewBag.Service = service;
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
            ServiceState currentState = _workflow.GetCurrentState(instanceId, org, service, requestContext.UserContext.ReporteeId);
            string nextUrl = _workflow.GetUrlForCurrentState(instanceId, org, service, currentState.State);
            return Redirect(nextUrl);
        }

        /// <summary>
        /// Method that logs inn test user
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The testUserId</param>
        /// <param name="reportee">The reportee chosen</param>
        /// <returns>Redirects to returnUrl</returns>
        public async Task<IActionResult> LoginTestUser(string org, string service, int id, string reportee)
        {
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

            return LocalRedirect($"/designer/{org}/{service}/ManualTesting/Index?reporteeId={id}");
        }
    }
}
