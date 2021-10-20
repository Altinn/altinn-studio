using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class DelegationMetadataRepositoryMock : IDelegationMetadataRepository
    {
        private static List<string> validAppIds = new List<string> { "org1/app1" };

        public Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId, bool isDeleted)
        {
            if (string.IsNullOrEmpty(altinnAppId) || altinnAppId == "error/postgrewritechangefail")
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(true);
        }

        public Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            if (altinnAppId == "error/postgregetcurrentfail")
            {
                throw new Exception("Some exception happened");
            }

            if (validAppIds.Contains(altinnAppId))
            {
                return Task.FromResult(TestDataHelper.GetDelegationChange(altinnAppId));
            }

            return Task.FromResult<DelegationChange>(null);
        }

        public Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            return Task.FromResult(new List<DelegationChange>());
        }
    }
}
