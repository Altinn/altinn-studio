using System;
using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service that handles functionality used for workflow
    /// </summary>
    public class WorkflowSI : IWorkflowSI
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string CreateInitialServiceStateMethod = "InitializeServiceState";
        private const string UpdateCurrentStateMethod = "UpdateCurrentState";
        private const string GetCurrentStateMethod = "GetCurrentState";

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkflowSI"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        public WorkflowSI(IOptions<ServiceRepositorySettings> repositorySettings, IOptions<TestdataRepositorySettings> testdataRepositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _settings = repositorySettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public ServiceState InitializeService(Guid instanceId, string owner, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(CreateInitialServiceStateMethod, owner, service, developer, partyId)}&instanceId={instanceId}";
            ServiceState returnState = null;
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (!response.Result.IsSuccessStatusCode)
                {
                    throw new Exception("Unable initialize service");
                }
                else
                {
                    try
                    {
                        returnState = response.Result.Content.ReadAsAsync<ServiceState>().Result;
                    }
                    catch
                    {
                        return returnState;
                    }
                }
            }

            return returnState;
        }

        /// <inheritdoc/>
        public ServiceState MoveServiceForwardInWorkflow(Guid instanceId, string owner, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(UpdateCurrentStateMethod, owner, service, developer, partyId)}&instanceId={instanceId}";
            ServiceState returnState = null;
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (!response.Result.IsSuccessStatusCode)
                {
                    throw new Exception("Unable to update state of service");
                }
                else
                {
                    try
                    {
                        returnState = response.Result.Content.ReadAsAsync<ServiceState>().Result;
                    }
                    catch
                    {
                        return returnState;
                    }
                }
            }

            return returnState;
        }

        /// <inheritdoc/>
        public string GetUrlForCurrentState(Guid instanceId, string owner, string service, WorkflowStep currentState)
        {
            switch (currentState)
            {
                case WorkflowStep.FormFilling:
                case WorkflowStep.Submit:
                case WorkflowStep.Archived:
                    return $"/runtime/{owner}/{service}/{instanceId}/#Preview";
                default:
                    return $"/runtime/{owner}/{service}/ManualTesting";
            }
        }

        /// <inheritdoc/>
        public ServiceState GetCurrentState(Guid instanceId, string owner, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetCurrentStateMethod, owner, service, developer, partyId)}&instanceId={instanceId}";
            ServiceState returnState = null;
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (!response.Result.IsSuccessStatusCode)
                {
                    throw new Exception("Unable to fetch service state");
                }
                else
                {
                    try
                    {
                        returnState = response.Result.Content.ReadAsAsync<ServiceState>().Result;
                    }
                    catch
                    {
                        return returnState;
                    }
                }
            }

            return returnState;
        }
    }
}
