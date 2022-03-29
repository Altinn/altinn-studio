using System;
using System.Collections.Generic;
using System.Linq;
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

        public Task<DelegationChange> InsertDelegation(DelegationChange delegationChange)
        {
            List<DelegationChange> current;
            string coveredBy = delegationChange.CoveredByPartyId != null ? $"p{delegationChange.CoveredByPartyId}" : $"u{delegationChange.CoveredByUserId}";
            string key = $"{delegationChange.AltinnAppId}/{delegationChange.OfferedByPartyId}/{coveredBy}";

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
                DelegationChangeId = 1337,
                DelegationChangeType = delegationChange.DelegationChangeType,
                AltinnAppId = delegationChange.AltinnAppId,
                OfferedByPartyId = delegationChange.OfferedByPartyId,
                CoveredByPartyId = delegationChange.CoveredByPartyId,
                CoveredByUserId = delegationChange.CoveredByUserId,
                PerformedByUserId = delegationChange.PerformedByUserId,
                BlobStoragePolicyPath = delegationChange.BlobStoragePolicyPath,
                BlobStorageVersionId = delegationChange.BlobStorageVersionId,
                Created = DateTime.Now
            };
    
            current.Add(currentDelegationChange);

            if (string.IsNullOrEmpty(delegationChange.AltinnAppId) || delegationChange.AltinnAppId == "error/postgrewritechangefail")
            {
                currentDelegationChange.DelegationChangeId = 0;
                return Task.FromResult(currentDelegationChange);
            }

            return Task.FromResult(currentDelegationChange);
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
                case "error/blobstorageleaselockwritefail":
                case "error/postgrewritechangefail":
                    result = TestDataHelper.GetDelegationChange(altinnAppId, offeredByPartyId, coveredByUserId, coveredByPartyId);
                    break;
                case "org1/app5":
                    result = TestDataHelper.GetDelegationChange(altinnAppId, offeredByPartyId, coveredByUserId, coveredByPartyId, changeType: DelegationChangeType.RevokeLast);
                    break;
                case "error/postgregetcurrentfail":
                    throw new Exception("Some exception happened");
                case "error/delegationeventfail":
                    result = TestDataHelper.GetDelegationChange(altinnAppId, offeredByPartyId, coveredByUserId, coveredByPartyId, changeType: DelegationChangeType.Grant);
                    break;
                default:
                    result = null;
                    break;
            }

            return Task.FromResult(result);
        }

        public Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            return Task.FromResult(new List<DelegationChange>());
        }

        public Task<List<DelegationChange>> GetAllCurrentDelegationChanges(List<int> offeredByPartyIds, List<string> altinnAppIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            List<DelegationChange> result = new List<DelegationChange>();

            if (altinnAppIds.Any(appId => appId == "org1/app1") && offeredByPartyIds.Contains(50001337) && (coveredByUserIds != null && coveredByUserIds.Contains(20001337)))
            {
                result.Add(TestDataHelper.GetDelegationChange("org1/app1", 50001337, coveredByUserId: 20001337));
            }

            if (altinnAppIds.Any(appId => appId == "skd/taxreport") && offeredByPartyIds.Contains(1000) && (coveredByUserIds != null && coveredByUserIds.Contains(20001337)))
            {
                result.Add(TestDataHelper.GetDelegationChange("skd/taxreport", 1000, coveredByUserId: 20001337));
            }

            if (altinnAppIds.Any(appId => appId == "org1/app1") && offeredByPartyIds.Contains(50001337) && (coveredByUserIds != null && coveredByUserIds.Contains(20001338)))
            {
                DelegationChange delegation = TestDataHelper.GetDelegationChange("org1/app1", 50001337, coveredByUserId: 20001338);
                delegation.DelegationChangeType = DelegationChangeType.RevokeLast;
                result.Add(delegation);
            }

            if (altinnAppIds.Any(appId => appId == "org1/app1") && offeredByPartyIds.Contains(50001337) && (coveredByPartyIds != null && coveredByPartyIds.Contains(50001336)))
            {
                result.Add(TestDataHelper.GetDelegationChange("org1/app1", 50001337, coveredByPartyId: 50001336));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001337) && (coveredByUserIds != null && coveredByUserIds.Contains(20001336)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001337, coveredByUserId: 20001336, performedByUserId: 20001337, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001337) && (coveredByUserIds != null && coveredByUserIds.Contains(20001335)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001337, coveredByPartyId: 50001335, performedByUserId: 20001337, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001337) && (coveredByPartyIds != null && coveredByPartyIds.Contains(50001336)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001337, coveredByPartyId: 50001338, performedByUserId: 20001337, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001338) && (coveredByPartyIds != null && coveredByPartyIds.Contains(50001339)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001338, coveredByPartyId: 50001339, performedByUserId: 20001338, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001338) && (coveredByPartyIds != null && coveredByPartyIds.Contains(50001340)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001338, coveredByPartyId: 50001340, performedByUserId: 20001338, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001338) && (coveredByPartyIds != null && coveredByPartyIds.Contains(50001336)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001338, coveredByPartyId: 50001336, performedByUserId: 20001339, changeType: DelegationChangeType.Grant));
            }

            if (altinnAppIds.Contains("SKD/TaxReport") && offeredByPartyIds.Contains(50001339) && (coveredByPartyIds != null && coveredByUserIds.Contains(20001336)))
            {
                result.Add(TestDataHelper.GetDelegationChange("SKD/TaxReport", 50001335, coveredByPartyId: 50001337, performedByUserId: 20001339, changeType: DelegationChangeType.Grant));
            }

            return Task.FromResult(result);
        }
    }
}
