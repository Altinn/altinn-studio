using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for archive service
    /// </summary>
    public class ArchiveStudioSI : IArchive
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ArchiveStudioSI"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="logger">The logger</param>
        public ArchiveStudioSI(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<ArchiveStudioSI> logger)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <inheritdoc/>
        public void ArchiveServiceModel<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string archiveDirectory = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/Archive/";
            if (!Directory.Exists(archiveDirectory))
            {
                Directory.CreateDirectory(archiveDirectory);
            }

            string formDataFilePath = $"{archiveDirectory}{instanceId}.xml";
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to archive service model: ", ex);
            }
        }

        /// <inheritdoc/>
        public object GetArchivedServiceModel(Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}/Archive/{instanceId}.xml";

            XmlSerializer serializer = new XmlSerializer(type);
            try
            {
                using (Stream stream = File.Open(formDataFilePath, FileMode.Open, FileAccess.Read))
                {
                    return serializer.Deserialize(stream);
                }
            }
            catch
            {
                return Activator.CreateInstance(type);
            }
        }
    }
}
