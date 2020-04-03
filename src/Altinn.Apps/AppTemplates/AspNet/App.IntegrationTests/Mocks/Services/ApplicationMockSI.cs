using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    public class ApplicationMockSI : IApplication
    {
        public ApplicationMockSI()
        {

        }

        public Task<Application> GetApplication(string org, string app)
        {
           return Task.FromResult(GetTestApplication(org, app));
        }

        private Application GetTestApplication(string org, string app)
        {
            string applicationPath = Path.Combine(GetMetadataPath(), org + @"\" + app + @"\applicationmetadata.json");
            if (File.Exists(applicationPath))
            {
                string content = System.IO.File.ReadAllText(applicationPath);
                Application application = (Application)JsonConvert.DeserializeObject(content, typeof(Application));
                return application;
            }
            return null;
        }

        private string GetMetadataPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Metadata");
        }
    }
}
