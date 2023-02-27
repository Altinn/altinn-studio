using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller exposing endpoints that handle metadata in config.json
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/config")]
    [Obsolete("ConfigController is deprecated.")]
    public class ConfigController : Controller
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly ITextsService _textsService;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfigController"/> class.
        /// </summary>
        /// <param name="repositorySettings">The repository settings.</param>
        /// <param name="textsService">The texts service</param>
        /// <param name="applicationMetadataService">The application metadata service.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public ConfigController(ServiceRepositorySettings repositorySettings, ITextsService textsService, IApplicationMetadataService applicationMetadataService, IHttpContextAccessor httpContextAccessor, ILogger<ConfigController> logger)
        {
            _settings = repositorySettings;
            _textsService = textsService;
            _applicationMetadataService = applicationMetadataService;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// Method to retrieve the app description from the metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service configuration</returns>
        [HttpGet]
        public ServiceConfiguration GetServiceConfig(string org, string app)
        {
            string serviceConfigPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject = null;
            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
            }

            return serviceConfigurationObject;
        }

        /// <summary>
        /// Method to set the app description in the metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceConfig">the service config</param>
        [HttpPost]
        public void SetServiceConfig(string org, string app, [FromBody] dynamic serviceConfig)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string serviceConfigPath = _settings.GetServicePath(org, app, developer) + _settings.ServiceConfigFileName;
            ServiceConfiguration serviceConfigurationObject;

            if (System.IO.File.Exists(serviceConfigPath))
            {
                string serviceConfiguration = System.IO.File.ReadAllText(serviceConfigPath, Encoding.UTF8);
                serviceConfigurationObject = JsonConvert.DeserializeObject<ServiceConfiguration>(serviceConfiguration);
                serviceConfigurationObject.ServiceDescription = serviceConfig.serviceDescription.ToString();
                serviceConfigurationObject.ServiceId = serviceConfig.serviceId.ToString();
                serviceConfigurationObject.ServiceName = serviceConfig.serviceName.ToString();
            }
            else
            {
                new FileInfo(serviceConfigPath).Directory.Create();
                serviceConfigurationObject = new ServiceConfiguration()
                {
                    RepositoryName = app,
                    ServiceDescription = serviceConfig.serviceDescription.ToString(),
                    ServiceId = serviceConfig.serviceId.ToString(),
                    ServiceName = serviceConfig.serviceName.ToString()
                };
            }

            System.IO.File.WriteAllText(serviceConfigPath, JObject.FromObject(serviceConfigurationObject).ToString(), Encoding.UTF8);
            _textsService.UpdateTextsForKeys(org, app, developer, new Dictionary<string, string> { { "appName", serviceConfig.serviceName.ToString() } }, "nb");
            _applicationMetadataService.UpdateAppTitleInAppMetadata(org, app, "nb", serviceConfigurationObject.ServiceName);
        }
    }
}
