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

        public Task<List<Application>> FindAll()
        {
            throw new NotImplementedException();
        }

        public Task<List<Application>> FindByOrg(string org)
        {
            throw new NotImplementedException();
        }

        public Task<Application> Update(Application item)
        {
            throw new NotImplementedException();
        }

        public Task<Dictionary<string, string>> GetAllAppTitles()
        {
            Dictionary<string, string> appTitles = new Dictionary<string, string>();

            if (Directory.Exists(GetAppsPath()))
            {
                string[] orgFolders = Directory.GetDirectories(GetAppsPath());
                foreach (string orgDirectory in orgFolders)
                {
                    string[] appDirectiories = Directory.GetDirectories(orgDirectory);

                    foreach (var appDirectory in appDirectiories)
                    {
                        string metadataPath = Path.Combine(appDirectory + @"\config\applicationmetadata.json");
                        if (File.Exists(metadataPath))
                        {
                            string content = File.ReadAllText(metadataPath);
                            Application application = (Application)JsonConvert.DeserializeObject(content, typeof(Application));
                            string titles = string.Empty;
                            foreach (string title in application.Title.Values)
                            {
                                titles += title + ";";
                            }

                            appTitles.Add(application.Id, titles);
                        }
                    }
                }
            }

            return Task.FromResult(appTitles);
        }

        private static Application GetTestApplication(string org, string app)
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

        private static string GetAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ApplicationRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\apps");
        }
    }
}
