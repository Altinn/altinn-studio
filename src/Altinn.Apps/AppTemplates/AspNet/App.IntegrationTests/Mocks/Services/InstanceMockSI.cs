using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Models;
using Microsoft.AspNetCore.Http;
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
        private readonly IHttpContextAccessor _httpContextAccessor;

        public InstanceMockSI(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;

        }


        public Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string app, string org, int instanceOwnerId, Guid instanceId)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceId);
            return Task.FromResult(instance);
        }

        public Task<List<Instance>> GetInstances(string app, string org, int instanceOwnerId)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdateInstance(object dataToSerialize, string app, string org, int instanceOwnerId, Guid instanceId)
        {
            throw new NotImplementedException();
        }

        private Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instancePath = Path.Combine(GetInstancePath(), org + @"\" + app + @"\" + instanceOwnerId + @"\" + instanceId.ToString() + ".json");
            if (File.Exists(instancePath))
            {
                string content = System.IO.File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return instance;
            }
            return null;
        }

        private string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }
    }
}
