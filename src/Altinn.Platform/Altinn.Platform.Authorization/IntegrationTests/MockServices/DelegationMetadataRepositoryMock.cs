using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class DelegationMetadataRepositoryMock : IDelegationMetadataRepository
    {
        public Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId, bool isDeleted)
        {
            if (offeredByPartyId != 0)
            {
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            return Task.FromResult<DelegationChange>(null);
        }

        public Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            return Task.FromResult(new List<DelegationChange>());
        }
    }
}
