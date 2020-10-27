using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class ApplicationRepositoryMock : IApplicationRepository
    {
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
           return await Task.FromResult(GetTestApplication(org, appId.Split("/")[1]));
        }

        public async Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            Dictionary<string, Dictionary<string, string>> appTitles = new Dictionary<string, Dictionary<string, string>>();

            foreach (string appId in appIds)
            {
                Application app = GetTestApplication(appId.Split("/")[0], appId.Split("/")[1]);
                appTitles.Add(app.Id, app.Title);
            }

            return await Task.FromResult(appTitles);
        }

        public Task<List<Application>> ListApplications(string org)
        {
            throw new NotImplementedException();
        }

        public Task<Application> Update(Application item)
        {
            throw new NotImplementedException();
        }

        private Application GetTestApplication(string org, string app)
        {
            string applicationPath = Path.Combine(GetAppsPath(), org + @"\" + app + @"\config\applicationmetadata.json");
            if (File.Exists(applicationPath))
            {
                string content = File.ReadAllText(applicationPath);
                Application application = (Application)JsonConvert.DeserializeObject(content, typeof(Application));
                return application;
            }

            return null;
        }

        private string GetAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ApplicationRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\apps");
        }
    }
}
