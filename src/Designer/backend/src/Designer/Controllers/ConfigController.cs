#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller exposing endpoints that handle metadata in config.json
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/config")]
    public class ConfigController : Controller
    {
        private readonly ITextsService _textsService;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ConfigController"/> class.
        /// </summary>
        /// <param name="textsService">The texts service</param>
        /// <param name="applicationMetadataService">The application metadata service.</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        /// <param name="logger">the log handler.</param>
        public ConfigController(ITextsService textsService,
            IApplicationMetadataService applicationMetadataService, IHttpContextAccessor httpContextAccessor,
            ILogger<ConfigController> logger)
        {
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
        public async Task<ServiceConfiguration> GetServiceConfig(string org, string app)
        {
            ServiceConfiguration serviceConfiguration = await _applicationMetadataService.GetAppMetadataConfigAsync(org, app);
            return serviceConfiguration;
        }

        /// <summary>
        /// Method to set the app description in the metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceConfig">the service config</param>
        [HttpPost]
        public async Task SetServiceConfig(string org, string app, [FromBody] dynamic serviceConfig)
        {
            ServiceConfiguration serviceConfigurationObject = await _applicationMetadataService.GetAppMetadataConfigAsync(org, app);
            serviceConfigurationObject.ServiceDescription = serviceConfig.serviceDescription.ToString();
            serviceConfigurationObject.ServiceId = serviceConfig.serviceId.ToString();
            serviceConfigurationObject.ServiceName = serviceConfig.serviceName.ToString();

            await _applicationMetadataService.UpdateAppMetadataConfigAsync(org, app, serviceConfigurationObject);
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            await _textsService.UpdateTextsForKeys(org, app, developer, new Dictionary<string, string> { { "appName", serviceConfig.serviceName.ToString() } }, "nb");
            await _applicationMetadataService.UpdateAppTitleInAppMetadata(org, app, "nb", serviceConfig.serviceName.ToString());

        }
    }
}
