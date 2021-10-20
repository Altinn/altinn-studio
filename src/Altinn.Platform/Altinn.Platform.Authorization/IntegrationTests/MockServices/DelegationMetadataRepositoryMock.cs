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

        public Task<List<DelegationChange>> GetAllCurrentDelegationChanges(List<string> altinnAppIds, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            List<DelegationChange> list = new List<DelegationChange>();
            if (altinnAppIds[0] == "SKD/TaxReport" && offeredByPartyIds.Count > 0 && coveredByUserIds[0] == 20001336)
            {
                foreach (int offeredByPartyId in offeredByPartyIds)
                {
                    if (offeredByPartyId == 50001337)
                    {
                        list.Add(new DelegationChange
                        {
                            PolicyChangeId = 1,
                            AltinnAppId = altinnAppIds[0],
                            OfferedByPartyId = offeredByPartyIds[0],
                            CoveredByUserId = coveredByUserIds[0],
                            DelegatedByUserId = 20001337,
                            BlobStoragePolicyPath = $"{altinnAppIds[0]}/{offeredByPartyIds[0]}/{coveredByUserIds[0]}",
                            BlobStorageVersionId = DateTime.Today.ToString(),
                            IsDeleted = false,
                            Created = DateTime.Today
                        });
                    }
                }
            }

            if (altinnAppIds[0] == "SKD/TaxReport" && offeredByPartyIds[0] == 50001337 && coveredByPartyIds.Count > 0)
            {
                if (coveredByPartyIds[0] == 50001336)
                {
                    list.Add(new DelegationChange
                    {
                        PolicyChangeId = 2,
                        AltinnAppId = altinnAppIds[0],
                        OfferedByPartyId = offeredByPartyIds[0],
                        CoveredByPartyId = coveredByPartyIds[0],
                        DelegatedByUserId = 20001337,
                        BlobStoragePolicyPath = $"{altinnAppIds[0]}/{offeredByPartyIds[0]}/{coveredByPartyIds[0]}",
                        BlobStorageVersionId = DateTime.Today.ToString(),
                        IsDeleted = false,
                        Created = DateTime.Today
                    });
                }
            }

            return Task.FromResult(list);
        }
    }
}
