using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;

using Microsoft.Extensions.Options;

namespace LocalTest.Services.Storage.Implementation
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public ApplicationRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<Application> Create(Application item)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Delete(string appId, string org)
        {
            throw new NotImplementedException();
        }

        public async Task<Application> FindOne(string appId, string org)
        {
            var filename = GetApplicationsDirectory() + appId + ".json";
            if (File.Exists(filename))
            {
                var application = JsonSerializer.Deserialize<Application>(await File.ReadAllTextAsync(filename));
                if (application is not null)
                {
                    return application;
                }
            }

            throw new Exception($"applicationmetadata for '{appId} not found'");
        }

        public Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            throw new NotImplementedException();
        }

        public async Task<List<Application>> FindByOrg(string org)
        {
            var apps = new List<Application>();
            foreach (var app in Directory.GetFiles(GetApplicationsDirectory() + org))
            {
                apps.Add(JsonSerializer.Deserialize<Application>(await File.ReadAllTextAsync(app)));
            }

            return apps;
        }

        public async Task<Application> Update(Application item)
        {
            Directory.CreateDirectory(GetApplicationsDirectory()+item.Id.Split('/')[0]);
            JsonSerializerOptions options = new JsonSerializerOptions
            {
                WriteIndented = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            await File.WriteAllTextAsync(GetApplicationsDirectory() + item.Id + ".json", JsonSerializer.Serialize(item, options));
            return item;
        }

        public async Task<List<Application>> FindAll()
        {
            var apps = new List<Application>();
            foreach (var org in (new DirectoryInfo(GetApplicationsDirectory()).GetDirectories()))
            {
                apps.AddRange(await FindByOrg(org.Name));
            }

            return apps;
        }

        public Task<Dictionary<string, string>> GetAllAppTitles()
        {
            throw new NotImplementedException();
        }

        public string GetApplicationsDirectory()
        {
            return Path.Join(_localPlatformSettings.LocalTestingStorageBasePath, _localPlatformSettings.DocumentDbFolder, _localPlatformSettings.ApplicationsDataFolder);
        }
    }
}
