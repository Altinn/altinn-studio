using Altinn.ResourceRegistry.Core;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ResourceRegistryTest.Mocks
{
    public class PolicyRepositoryMock : IPolicyRepository
    {
        public async Task<Stream> GetPolicyAsync(string resourceId)
        {
            resourceId = Path.Combine(GetPolicyContainerPath(), resourceId, "resourcepolicy.xml");
            if (File.Exists(resourceId))
            {
                return new FileStream(resourceId, FileMode.Open, FileAccess.Read, FileShare.Read); 
            }

            return null;
        }

        public Task<Stream> GetPolicyVersionAsync(string filepath, string version)
        {
            throw new NotImplementedException();
        }

        public Task<bool> PolicyExistsAsync(string filepath)
        {
            throw new NotImplementedException();
        }

        public void ReleaseBlobLease(string filepath, string leaseId)
        {
            throw new NotImplementedException();
        }

        public Task<string> TryAcquireBlobLease(string filepath)
        {
            throw new NotImplementedException();
        }

        private static string GetPolicyContainerPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "..", "..", "..", "Data", "ResourcePolicies");
        }

    }
}
