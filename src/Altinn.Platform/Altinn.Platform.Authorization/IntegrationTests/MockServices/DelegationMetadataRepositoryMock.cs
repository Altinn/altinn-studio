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
        public Dictionary<string, List<DelegationChange>> MetadataChanges { get; set; }

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
                current = MetadataChanges[key];
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

            if (string.IsNullOrEmpty(altinnAppId) || altinnAppId == "error/postgrewritechangefail")
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(true);
        }

        public Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            DelegationChange result;
            switch (altinnAppId)
            {
                case "org1/app1":
                case "org1/app3":
                case "org2/app3":
                case "org1/app4":
                    result = TestDataHelper.GetDelegationChange(altinnAppId, offeredByPartyId, coveredByUserId, coveredByPartyId);
                    break;
                case "error/postgregetcurrentfail":
                    throw new Exception("Some exception happened");            
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
                            PerformedByUserId = 20001337,
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
                        PerformedByUserId = 20001337,
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
