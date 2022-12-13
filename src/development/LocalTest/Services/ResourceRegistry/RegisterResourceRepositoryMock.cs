using Altinn.ResourceRegistry.Core;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Models;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ResourceRegistryTest.Mocks
{
    public class RegisterResourceRepositoryMock : IResourceRegistryRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        public RegisterResourceRepositoryMock(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }


        public async Task<ServiceResource> CreateResource(ServiceResource resource)
        {
            return await Task.FromResult<ServiceResource>(null);
        }

        public async Task<ServiceResource> DeleteResource(string id)
        {
            throw new NotImplementedException();
        }

        public async Task<ServiceResource> GetResource(string id)
        {
            List<ServiceResource> resources = await Search(new ResourceSearch() { Id = id });

            if(resources.Count == 1)
            {
                return resources[0];
            }

            return null;
        }

        public async Task<List<ServiceResource>> Search(ResourceSearch resourceSearch)
        {
            List<ServiceResource> resources = new List<ServiceResource>();
            string[] files =  Directory.GetFiles(GetResourcePath());
            if(files != null)
            {
                foreach (string file in files)
                {
                    try
                    {
                        string content = System.IO.File.ReadAllText(file);
                        ServiceResource? resource = System.Text.Json.JsonSerializer.Deserialize<ServiceResource>(content, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase }) as ServiceResource;
                        if (resourceSearch.Id == null)
                        {
                            resources.Add(resource);
                        }
                        else
                        {
                            if (resourceSearch.Id.Equals(resource.Identifier))
                            {
                                resources.Add(resource);
                            }
                        }
                    }
                    catch(Exception
                     ex)
                    {
                        Console.WriteLine(file + ex.ToString());
                    }
                }
            }

            return resources;
        }

        private string GetResourcePath(string id)
        {
            return Path.Combine(GetResourcePath(), id + ".json");
        }

        Task<ServiceResource> IResourceRegistryRepository.UpdateResource(ServiceResource resource)
        {
            return Task.FromResult(resource);
        }

        private string GetResourcePath()
        {
            string unitTestFolder = _localPlatformSettings.LocalTestingStaticTestDataPath;
            return Path.Combine(unitTestFolder, "authorization", "resources");
        }
    }
}
