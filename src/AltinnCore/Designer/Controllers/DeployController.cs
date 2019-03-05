using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.ModelBinding;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Implementation for deploy actions
    /// </summary>
    [Authorize]
    public class DeployController : Controller
    {
        private readonly ISourceControl _sourceControl;
        private IConfiguration _configuration;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeployController"/> class
        /// </summary>
        /// <param name="sourceControl">The source control service</param>
        /// <param name="configuration">The configuration service</param>
        public DeployController(
            ISourceControl sourceControl,
            IConfiguration configuration)
        {
            _sourceControl = sourceControl;
            _configuration = configuration;
        }

        /// <summary>
        /// View for configuration of deployment
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The the index view for deployment</returns>
        public IActionResult Index(string org, string service, string edition)
        {
            ViewBag.ServiceUnavailable = false;
            if (_configuration["AccessTokenDevOps"] == null)
            {
                ViewBag.ServiceUnavailable = true;
            }

            return View();
        }

        /// <summary>
        /// Start a new deployment
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The result of trying to start a new deployment</returns>
        [HttpPost]
        public async Task<JsonResult> StartDeployment(string org, string service, string edition)
        {
            if (_configuration["AccessTokenDevOps"] == null)
            {
                ViewBag.ServiceUnavailable = true;
                return Json(new
                {
                    Success = false,
                    Message = "Deployment unavailable",
                });
            }

            string credentials = _configuration["AccessTokenDevOps"];

            string result = string.Empty;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                    object buildContent = new
                    {
                        definition = new
                        {
                            id = 5,
                        },
                        parameters = $"{{\"SERVICE_ORG\":\"{org}\",\"SERVICE_REPO\":\"{service}\",\"SERVICE_TOKEN\":\"{_sourceControl.GetAppToken()}\",\"system.debug\":\"false\"}}\"",
                    };

                    string buildjson = JsonConvert.SerializeObject(buildContent);
                    StringContent httpContent = new StringContent(buildjson, Encoding.UTF8, "application/json");
                    using (HttpResponseMessage response = await client.PostAsync("https://dev.azure.com/brreg/altinn-studio/_apis/build/builds?api-version=5.0-preview.4", httpContent))
                    {
                        response.EnsureSuccessStatusCode();
                        BuildModel responseBody = await response.Content.ReadAsAsync<BuildModel>();
                        result = responseBody.Id;
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Success = true,
                    Message = "Deployment failed " + ex,
                });
            }

            return Json(new
            {
                Success = true,
                BuildId = result,
                Message = "Deployment status: " + result,
            });
        }

        /// <summary>
        /// Gets deployment status
        /// </summary>
        /// <param name="buildId">the id of the build for which the deployment status is to be retrieved</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The build status of the deployment build</returns>
        [HttpPost]
        public async Task<JsonResult> FetchDeploymentStatus([FromBody]dynamic buildId, string org, string service, string edition)
        {
            string credentials = _configuration["AccessTokenDevOps"];
            BuildModel buildModel = null;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

                    using (HttpResponseMessage response = await client.GetAsync(string.Format("https://dev.azure.com/brreg/altinn-studio/_apis/build/builds/{0}?api-version=5.0-preview.4", buildId)))
                    {
                        response.EnsureSuccessStatusCode();
                        buildModel = await response.Content.ReadAsAsync<BuildModel>();
                        string responseBody = await response.Content.ReadAsStringAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Success = true,
                    Status = "Deployment failed " + ex,
                });
            }

            return Json(new
            {
                Success = true,
                Message = "Deployment status: " + buildModel.Status,
                buildModel.Result,
                buildModel.Status,
                buildModel.StartTime,
                buildModel.FinishTime,
            });
        }
    }
}
