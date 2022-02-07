using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// The app implementation of the process service.
    /// </summary>
    public class ProcessAppSI : IProcess
    {
        private readonly AppSettings _appSettings;
        private readonly ILogger<ProcessAppSI> _logger;
        private readonly IInstanceEvent _instanceEventClient;
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Gets the internal ProcessHelper instance
        /// </summary>
        public ProcessHelper ProcessHelper { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<PlatformSettings> platformSettings,
            IOptions<AppSettings> appSettings,
            IInstanceEvent instanceEventClient,
            ILogger<ProcessAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient)
        {
            _appSettings = appSettings.Value;
            _instanceEventClient = instanceEventClient;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            ProcessHelper = new ProcessHelper(GetProcessDefinition());
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
            _client = httpClient;
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition()
        {
            string bpmnFilePath = _appSettings.AppBasePath + _appSettings.ConfigurationFolder + _appSettings.ProcessFolder + _appSettings.ProcessFileName;

            try
            {
                Stream processModel = File.OpenRead(bpmnFilePath);

                return processModel;
            }
            catch (Exception processDefinitionException)
            {
                _logger.LogError($"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}");
                throw;
            }
        }
        
        /// <inheritdoc />
        public async Task<ProcessHistoryList> GetProcessHistory(string instanceGuid, string instanceOwnerPartyId)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/process/history";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _appSettings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                ProcessHistoryList processHistoryList = JsonConvert.DeserializeObject<ProcessHistoryList>(eventData);

                return processHistoryList;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task DispatchProcessEventsToStorage(Instance instance, List<InstanceEvent> events)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (InstanceEvent instanceEvent in events)
            {
                instanceEvent.InstanceId = instance.Id;
                await _instanceEventClient.SaveInstanceEvent(instanceEvent, org, app);
            }
        }
    }
}
