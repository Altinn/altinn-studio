using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Workflow;
using Altinn.App.Services.ServiceMetadata;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace App.IntegrationTests.Mocks.Services
{
    public class RepositoryMockSI : IRepository
    {
        public Application GetApplication(string org, string app)
        {
            return GetTestApplication(org, app);
        }

        public string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel")
        {
            throw new NotImplementedException();
        }

        public ServiceMetadata GetServiceMetaData(string org, string app)
        {
            throw new NotImplementedException();
        }

        public List<WorkFlowStep> GetWorkFlow(string org, string app)
        {
            throw new NotImplementedException();
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
