using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Azure;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Administration Point responsible for storing and modifying delegation policies
    /// </summary>
    public class PolicyInformationPoint : IPolicyInformationPoint
    {
        private readonly IPolicyRetrievalPoint _prp;
        private readonly IPolicyRepository _policyRepository;
        private readonly IPolicyDelegationRepository _delegationRepository;
        private readonly IMemoryCache _memoryCache;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyAdministrationPoint"/> class.
        /// </summary>
        /// <param name="policyRetrievalPoint">The policy retrieval point</param>
        /// <param name="policyRepository">The policy repository</param>
        /// <param name="delegationRepository">The delegation change repository</param>
        /// <param name="memoryCache">The cache handler</param>
        /// <param name="settings">The app settings</param>
        public PolicyInformationPoint(IPolicyRetrievalPoint policyRetrievalPoint, IPolicyRepository policyRepository, IPolicyDelegationRepository delegationRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
        {
            _prp = policyRetrievalPoint;
            _policyRepository = policyRepository;
            _delegationRepository = delegationRepository;
            _memoryCache = memoryCache;
            _generalSettings = settings.Value;
        }

        /// <inheritdoc/>
        public async Task<List<Rule>> GetRulesAsync(List<string> orgApp, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            List<Rule> rules = new List<Rule>();
            List<XacmlPolicy> policies = new List<XacmlPolicy>();
            List<DelegationChange> delegationChanges = await _delegationRepository.GetAllCurrentDelegationChanges(orgApp, offeredByPartyIds, coveredByPartyIds, coveredByUserIds);
            foreach (DelegationChange delegationChange in delegationChanges)
            {
                XacmlPolicy policy = await _prp.GetPolicyVersionAsync(delegationChange.BlobStoragePolicyPath, delegationChange.BlobStorageVersionId);
                rules.AddRange(DelegationHelper.GetRulesFromPolicyAndDelegationChange(policy.Rules, delegationChange));
            }

            return rules;
        }
    }
}
