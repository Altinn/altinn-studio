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
        public Dictionary<string, List<DelegationChange>> MetadataChanges { get; private set; }

        public DelegationMetadataRepositoryMock()
        {
            MetadataChanges = new Dictionary<string, List<DelegationChange>>();
        }

        public Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId, bool isDeleted)
        {
            List<DelegationChange> current;
            string key = $"{altinnAppId}/{offeredByPartyId}/{coveredByPartyId ?? coveredByUserId}";

            if (MetadataChanges.ContainsKey(key))
            {
                current = MetadataChanges[altinnAppId];
            }
            else
            {
                current = new List<DelegationChange>();
                MetadataChanges[key] = current;
            }

            DelegationChange currentDelegationChange = new DelegationChange
            {
                AltinnAppId = altinnAppId,
                OfferedByPartyId = offeredByPartyId,
                CoveredByPartyId = coveredByPartyId,
                CoveredByUserId = coveredByUserId,
                PerformedByUserId = delegatedByUserId,
                BlobStoragePolicyPath = blobStoragePolicyPath,
                BlobStorageVersionId = blobStorageVersionId,
                IsDeleted = isDeleted,
                Created = DateTime.Now
            };

            current.Add(currentDelegationChange);

            if (offeredByPartyId != 0)
            {
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            DelegationChange result;
            switch (altinnAppId)
            {
                case "org1/app3":
                case "org2/app3":
                case "org1/app4":
                    result = new DelegationChange
                    {
                        AltinnAppId = altinnAppId,
                        BlobStorageVersionId = "CorrectLeaseId",
                        BlobStoragePolicyPath = $"{altinnAppId}/{offeredByPartyId}/{coveredByPartyId ?? coveredByUserId}/delegationpolicy.xml",
                        CoveredByPartyId = coveredByPartyId,
                        CoveredByUserId = coveredByUserId,
                        Created = DateTime.Now,
                        IsDeleted = false,
                        OfferedByPartyId = offeredByPartyId,
                        PerformedByUserId = 20001336,
                        PolicyChangeId = new Random().Next()
                    };
                    break;
                default:
                    result = null;
                    break;
            }

            return Task.FromResult<DelegationChange>(result);
        }

        public Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            return Task.FromResult(new List<DelegationChange>());
        }
    }
}
