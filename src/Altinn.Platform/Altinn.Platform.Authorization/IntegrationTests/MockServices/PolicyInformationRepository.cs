using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyInformationRepository : IPolicyInformationRepository
    {
        public async Task<Instance> GetInstance(string instanceId, int instanceOwnerId)
        {
            return GetTestInstance(instanceId, instanceOwnerId);
        }

        /// <inheritdoc/>
        public async Task<Instance> GetInstance(string instanceId)
        {
            int instanceOwnerId = Convert.ToInt32(instanceId.Split('/')[0]);
            return GetTestInstance(instanceId, instanceOwnerId);
        }

        /// <inheritdoc/>
        public async Task<Application> GetApplication(string app, string org)
        {
            return GetTestApplication(app, org);
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Applications\");
        }

        private Application GetTestApplication(string app, string org)
        {
            string content = null;

            content = System.IO.File.ReadAllText(Path.Combine(GetAltinnAppsPath(), org + @"-" + app + ".json"));
            Application application = (Application)JsonConvert.DeserializeObject(content, typeof(Application));
            return application;
        }

        private string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }

        private Instance GetTestInstance(string instanceId, int instanceOwnerId)
        {
            string content = null;

            string partyPart = instanceId.Split('/')[0];

            string instancePart = instanceId.Split('/')[1];

            content = System.IO.File.ReadAllText(Path.Combine(GetInstancePath(), partyPart + @"\" + instancePart + ".json"));
            Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
            return instance;
        }
    }
}
