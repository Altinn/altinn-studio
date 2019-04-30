using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service implementation for form service
    /// </summary>
    public class FormStudioSI : IForm
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private const string SaveFormAttachmentApiMethod = "SaveFormAttachment";
        private const string DeleteFormAttachmentApiMethod = "DeleteFormAttachment";
        private const string GetFormAttachmentsApiMethod = "GetFormAttachments";

        /// <summary>
        /// Initializes a new instance of the <see cref="FormStudioSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public FormStudioSI(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<GeneralSettings> generalSettings, ILogger<FormStudioSI> logger)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public object GetPrefill(string applicationOwnerId, string applicationId, Type type, int instanceOwnerId, string prefillkey)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/prefill/{prefillkey}.xml";
            try
            {
                using (Stream stream = File.Open(prefillFilePath, FileMode.Open, FileAccess.Read))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    return serializer.Deserialize(stream);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Error occured when trying to fetch prefil: ", ex);
            }

            return null;
        }
    }
}
