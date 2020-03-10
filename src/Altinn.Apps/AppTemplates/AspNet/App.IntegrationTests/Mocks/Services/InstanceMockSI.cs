using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    public class InstanceMockSI : IInstance
    {
        private readonly ILogger _logger;

        public InstanceMockSI(ILogger<IInstance> logger)
        {
            _logger = logger;
        }

        public Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            string partyId = instanceTemplate.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();

            Instance instance = new Instance
            {
                Id = $"{partyId}/{instanceGuid}",
                AppId = $"{org}/{app}",
                Org = org,
                InstanceOwner = instanceTemplate.InstanceOwner,
                Process = instanceTemplate.Process,
                Data = new List<DataElement>(),
            };

            string instancePath = GetInstancePath(app, org, int.Parse(partyId), instanceGuid);
            _logger.LogInformation($"//// Created instance for app {org}/{app}. writing to path: {instancePath}");
            File.WriteAllText(instancePath, instance.ToString());

            return Task.FromResult(instance);
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(Instance instance)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            return await GetInstance(app, org, instanceOwnerId, instanceGuid);
        }

        public Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceId);

            if (instance != null)
            {
                instance.Data = GetDataElements(org, app, instanceOwnerId, instanceId);
            }
            return Task.FromResult(instance);
        }

        public Task<Instance> UpdateInstance(Instance instance)
        {
            string app = instance.AppId.Split("/")[1];
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            string instancePath = GetInstancePath(app, instance.Org, int.Parse(instance.InstanceOwner.PartyId), instanceGuid);
           
            File.WriteAllText(instancePath, JsonConvert.SerializeObject(instance));
            
            return Task.FromResult(instance);
        }

        public Task<Instance> UpdateProcess(Instance instance)
        {
            return UpdateInstance(instance);
        }

        private Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instancePath = GetInstancePath(app, org, instanceOwnerId, instanceId);
            if (File.Exists(instancePath))
            {
                string content = System.IO.File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return instance;
            }
            return null;
        }

        private string GetInstancePath(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            return Path.Combine(GetInstancesPath(), org + @"\" + app + @"\" + instanceOwnerId + @"\" + instanceId.ToString() + ".json");
        }

        private string GetInstancesPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }


        private List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = GetDataPath(org, app, instanceOwnerId, instanceId);
            List<DataElement> dataElements = new List<DataElement>();

            if (Directory.Exists(path))
            {
                string[] files = Directory.GetFiles(path);

                foreach (string file in files)
                {
                    string content = System.IO.File.ReadAllText(Path.Combine(path, file));
                    DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                    dataElements.Add(dataElement);
                }
            }

            return dataElements;
        }

        private string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        public Task<List<Instance>> GetInstances(int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }
    }
}
