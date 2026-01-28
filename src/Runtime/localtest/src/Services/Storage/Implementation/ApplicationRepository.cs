using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.Storage.Implementation
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly ILocalApp _localApp;

        public ApplicationRepository(IOptions<LocalPlatformSettings> localPlatformSettings, ILocalApp localApp)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _localApp = localApp;
        }

        public Task<Application> Create(Application item)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Delete(string appId, string org)
        {
            throw new NotImplementedException();
        }

        public async Task<Application> FindOne(string appId, string org, CancellationToken cancellationToken = default)
        {
            var applications = await _localApp.GetApplications();
            if (applications.ContainsKey(appId))
            {
                return applications[appId];
            }
            throw new Exception($"applicationmetadata for '{appId} not found'");
        }

        public Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            throw new NotImplementedException();
        }

        public async Task<List<Application>> FindByOrg(string org)
        {
            var applications = await _localApp.GetApplications();

            return applications.Values.Where(a=>a.Org == org).ToList();
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
            var applications = await _localApp.GetApplications();
            return applications.Values.ToList();
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
