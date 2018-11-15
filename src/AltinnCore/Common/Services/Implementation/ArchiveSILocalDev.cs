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
    public class ArchiveSILocalDev : IArchive
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string archiveServiceModelApiMethod = "ArchiveServiceModel";
        private const string getArchivedServiceModelApiMethod = "GetArchivedServiceModel";

        public ArchiveSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        public void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(archiveServiceModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            using (HttpClient client = new HttpClient())
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

        public object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(getArchivedServiceModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            using (HttpClient client = new HttpClient())
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
