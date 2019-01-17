using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
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
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string ArchiveServiceModelApiMethod = "ArchiveServiceModel";
        private const string GetArchivedServiceModelApiMethod = "GetArchivedServiceModel";

        /// <summary>
        /// Initializes a new instance of the <see cref="ArchiveSILocalDev"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        public ArchiveSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <inheritdoc/>
        public void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(ArchiveServiceModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to archive service model");
                    }
                }
            }
        }

        /// <inheritdoc/>
        public object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetArchivedServiceModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    try
                    {
                        using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                        {
                            return serializer.Deserialize(stream);
                        }
                    }
                    catch
                    {
                        return Activator.CreateInstance(type);
                    }
                }
                else
                {
                    return Activator.CreateInstance(type);
                }
            }
        }
    }
}
