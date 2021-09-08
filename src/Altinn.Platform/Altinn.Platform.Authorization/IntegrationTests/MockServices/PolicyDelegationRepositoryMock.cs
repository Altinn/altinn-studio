using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyDelegationRepositoryMock : IPolicyDelegationRepository
    {
        public Task<Stream> GetDelegationPolicyAsync(string filepath)
        {
            throw new NotImplementedException();
        }

        public Task<bool> WriteDelegationPolicyAsync(string filepath, Stream fileStream)
        {
            throw new NotImplementedException();
        }

        public Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId)
        {
            throw new NotImplementedException();
        }

        void IPolicyDelegationRepository.GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            throw new NotImplementedException();
        }

        void IPolicyDelegationRepository.GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            throw new NotImplementedException();
        }
    }
}
