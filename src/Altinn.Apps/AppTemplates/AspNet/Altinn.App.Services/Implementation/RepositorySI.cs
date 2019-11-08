using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Models.Workflow;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Implementation of the repository service needed for creating and updating apps in AltinnCore.
    /// </summary>
    public class RepositorySI : Interface.IRepository
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILoggerFactory _loggerFactory;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySI"/> class
        /// </summary>
        /// <param name="repositorySettings">The settings for the app repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="loggerFactory">the logger factory</param>
        /// <param name="logger">The logger</param>
        public RepositorySI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IHttpContextAccessor httpContextAccessor,
            ILoggerFactory loggerFactory,
            ILogger<RepositorySI> logger)
        {
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _loggerFactory = loggerFactory;
            _logger = logger;
        }


        /// <summary>
        /// Returns the <see cref="ServiceMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        public ServiceMetadata.ServiceMetadata GetServiceMetaData(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;
            try
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ServiceMetadata.ServiceMetadata>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching serviceMetadata ", ex);
                return null;
            }
        }

        /// <inheritdoc/>
        public Application GetApplication(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;
            try
            {
                if (File.Exists(filename))
                {
                    filedata = File.ReadAllText(filename, Encoding.UTF8);
                }

                return JsonConvert.DeserializeObject<Application>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching application metadata. {0}", ex);
                return null;
            }
        }

        /// <summary>
        /// Returns a list of workflow steps
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of workflow steps</returns>
        public List<WorkFlowStep> GetWorkFlow(string org, string app)
        {
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkFlowFileName;
            string textData = File.ReadAllText(filename, Encoding.UTF8);

            return JsonConvert.DeserializeObject<List<WorkFlowStep>>(textData);
        }

        /// <inheritdoc/>
        public string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel")
        {
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + dataModelName + ".prefill.json";
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

    }
}
