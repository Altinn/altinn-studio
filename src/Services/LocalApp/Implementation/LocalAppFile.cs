#nullable enable
using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Helpers;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppFile : ILocalApp
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        public LocalAppFile(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await File.ReadAllTextAsync(Path.Join(GetAppPath(appId), $"App/config/authorization/policy.xml"));
        }

        public async Task<Application?> GetApplicationMetadata(string? appId)
        {
            if(appId is null)
            {
                throw new ArgumentNullException(nameof(appId), "AppMode = file does not support null as appId");
            }

            var filename = Path.Join(GetAppPath(appId), $"App/config/applicationmetadata.json");
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

            Application? accessManagement = await GetAccessManagment();
            if (accessManagement != null)
            {
                ret.Add("accessmanagement", accessManagement);
                return ret;
            }

            // Get list of apps from the configured folder AppRepositoryBasePath
            string path = _localPlatformSettings.AppRepositoryBasePath;

            if (!Directory.Exists(path))
            {
                // No directory found.
                return ret;
            }

            // Check if there is a directory called config that indicates the path points to a single app
            string configPath = Path.Join(path, "config");
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
            var directories = new DirectoryInfo(path).EnumerateDirectories().Select(dirInfo => dirInfo.Name);

            foreach (string directory in directories)
            {
                Application? app = await GetApplicationMetadata(directory);
                if (app != null)
                {
                    ret.Add(directory, app);
                }
            }

            return ret;
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language)
        {
            string path = Path.Join(GetAppPath(app), "config", "texts", $"resource.{language.AsFileName()}.json");

            if (File.Exists(path))
            {
                string fileContent = await File.ReadAllTextAsync(path);
                var textResource = JsonConvert.DeserializeObject<TextResource>(fileContent);
                if (textResource != null)
                {
                    textResource.Id = $"{org}-{app}-{language}";
                    textResource.Org = org;
                    textResource.Language = language;
                    return textResource;
                }
            }

            return null;
        }

        public Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token)
        {
            throw new NotImplementedException();
        }

        private string GetAppPath(string appId)
        {
            return Path.Join(_localPlatformSettings.AppRepositoryBasePath, appId.Split('/').Last());
        }

        private async Task<Application?> GetAccessManagment()
        {
            try
            {
                HttpClient client = new HttpClient();
                client.BaseAddress = new Uri("http://localhost:5117/");
                HttpResponseMessage respnse = await client.GetAsync("swagger/index.html");
                if (respnse.StatusCode.Equals(HttpStatusCode.OK))
                {
                    Dictionary<string, string> title =  new Dictionary<string, string>();
                    title.Add("nb", "Access Management");
                    return new Application() { Id = "accessmanagement/ui", Title = title, Org="ALT" };
                }

                return null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public Task<AppTestDataModel?> GetTestData()
        {
            // Not implemented, but empty result is vald, so better than NotImplementedException
            return Task.FromResult<AppTestDataModel?>(null);
        }
    }
}
