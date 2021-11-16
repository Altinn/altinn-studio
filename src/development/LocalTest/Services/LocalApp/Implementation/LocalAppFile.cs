#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.Localtest.Interface;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppFile : ILocalApp
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly ILocalTestAppSelection _localTestAppSelectionService;
        public LocalAppFile(IOptions<LocalPlatformSettings> localPlatformSettings, ILocalTestAppSelection localTestAppSelectionService)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _localTestAppSelectionService = localTestAppSelectionService;
        }

        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await File.ReadAllTextAsync(GetAppPath(appId) + $"config/authorization/policy.xml");
        }

        public async Task<Application?> GetApplicationMetadata(string appId)
        {
            var filename = GetAppPath(appId) + $"config/applicationmetadata.json";
            if (File.Exists(filename))
            {
                var content = await File.ReadAllTextAsync(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<Application>(content);
            }
            
            return null;
        }

        public async Task<Dictionary<string, Application>> GetApplications()
        {
            var ret = new Dictionary<string, Application>();
            // Get list of apps from the configured folder AppRepositoryBasePath
            string path = _localPlatformSettings.AppRepositoryBasePath;

            if (!Directory.Exists(path))
            {
                // No directory found.
                return ret;
            }

            // Check if there is a directory called config that indicates the path points to a single app
            string configPath = path + "config";
            if (Directory.Exists(configPath))
            {
                Application? app = await GetApplicationMetadata("");
                if (app != null)
                {
                    ret.Add("", app);
                }
                return ret;
            }

            // Get list of directories in path
            var directories =  new DirectoryInfo(path).EnumerateDirectories().Select(dirInfo => dirInfo.Name);

            foreach(string directory in directories)
            {
                Application? app = await GetApplicationMetadata(directory);
                if (app != null)
                {
                    ret.Add(directory, app);
                }
            }

            return ret;
        }
        public Task<string?> GetAppId()
        {
            return Task.FromResult<string?>(null);
        }
        private string GetAppPath(string appId)
        {
            return $"{_localPlatformSettings.AppRepositoryBasePath.TrimEnd('/').TrimEnd('\\')}/{appId}/App/";
        }
    }
}