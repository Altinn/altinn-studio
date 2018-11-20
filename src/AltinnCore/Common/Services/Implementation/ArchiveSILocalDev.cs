using System;
using System.IO;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for archive service
    /// </summary>
    public class ArchiveSILocalDev : IArchive
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ArchiveSILocalDev"/> class
        /// </summary>
        /// <param name="repositorySettings"></param>
        /// <param name="httpContextAccessor"></param>
        public ArchiveSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId)
        {
            string archiveDirectory = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "Testdataforparty/" + partyId + "/Archive/";

            if (!Directory.Exists(archiveDirectory))
            {
                Directory.CreateDirectory(archiveDirectory);
            }

            string formDataFilePath = archiveDirectory + instanceId + ".xml";

            using (Stream stream = File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
            {
                XmlSerializer serializer = new XmlSerializer(type);
                serializer.Serialize(stream, dataToSerialize);
            }
        }

        /// <inheritdoc/>
        public object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId)
        {
            string formDataFilePath = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "Testdataforparty/" + partyId + "/Archive/" + instanceId + ".xml";

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
