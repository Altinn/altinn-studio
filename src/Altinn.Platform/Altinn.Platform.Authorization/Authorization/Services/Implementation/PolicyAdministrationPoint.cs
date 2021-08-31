using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Administration Point responsible for storing and modifying delegation policies
    /// </summary>
    public class PolicyAdministrationPoint : IPolicyAdministrationPoint
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
        public PolicyAdministrationPoint(IPolicyRetrievalPoint policyRetrievalPoint, IPolicyRepository policyRepository, IPolicyDelegationRepository delegationRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
        {
            _prp = policyRetrievalPoint;
            _policyRepository = policyRepository;
            _delegationRepository = delegationRepository;
            _memoryCache = memoryCache;
            _generalSettings = settings.Value;
        }

        /// <inheritdoc/>
        public async Task<bool> WritePolicyAsync(string org, string app, Stream fileStream)
        {
            if (string.IsNullOrWhiteSpace(org))
            {
                throw new ArgumentException("Org can not be null or empty");
            }

            if (string.IsNullOrWhiteSpace(app))
            {
                throw new ArgumentException("App can not be null or empty");
            }

            if (fileStream == null)
            {
                throw new ArgumentException("The policy file can not be null");
            }

            string filePath = PolicyHelper.GetAltinnAppsPolicyPath(org, app);
            Azure.Response<BlobContentInfo> response = await _policyRepository.WritePolicyAsync(filePath, fileStream);

            return response.GetRawResponse().Status == (int)HttpStatusCode.Created;
        }

        /// <inheritdoc/>
        public async Task<DelegatedPolicy> GetDelegationPolicy(string org, string app, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            return await _delegationRepository.GetCurrentDelegationChange($"{org}/{app}", offeredByPartyId, coveredByPartyId, coveredByUserId);
        }

        /// <inheritdoc/>
        public async Task<bool> WriteDelegationPolicy(string org, string app, int offeredByPartyId, string coveredBy, int delegatedByUserId, IList<Rule> rules)
        {
            if (!PolicyHelper.TryParseCoveredBy(coveredBy, out int coveredByPartyId, out int coveredByUserId))
            {
                return false;
            }

            string policyPath = PolicyHelper.GetAltinnAppDelegationPolicyPath(org, app, offeredByPartyId.ToString(), coveredBy);
            XacmlPolicy existingPolicy = await _prp.GetPolicyAsync(policyPath);

            XacmlPolicy delegationPolicy;
            if (existingPolicy != null)
            {
                // ToDo: evaluate (?) existing policy and add new rules
                delegationPolicy = existingPolicy;
                foreach (Rule rule in rules)
                {
                    delegationPolicy.Rules.Add(PolicyHelper.BuildDelegationRule(org, app, offeredByPartyId, coveredBy, rule));
                }
            }
            else
            {
                // ToDo: build new policy file
                delegationPolicy = PolicyHelper.BuildDelegationPolicy(org, app, offeredByPartyId, coveredBy, rules);
            }

            MemoryStream dataStream = new MemoryStream();
            XmlWriter writer = XmlWriter.Create(dataStream);

            // ToDo: Do xmlwriter through XacmlSerializer. Need ABAC nuget update or direct ABAC project dependency. Until this line is uncommented only empty xml files will be stored to blobstorage.
            ////XacmlSerializer.WritePolicy(writer, delegationPolicy);

            writer.Flush();
            dataStream.Position = 0;

            Azure.Response<BlobContentInfo> response = await _policyRepository.WritePolicyAsync(policyPath, dataStream);

            if (response.GetRawResponse().Status != (int)HttpStatusCode.Created)
            {
                return false;
            }

            // ToDo: How to handle transaction across blobstorage and postgresql?
            return await _delegationRepository.InsertDelegation($"{org}/{app}", offeredByPartyId, coveredByPartyId, coveredByUserId, delegatedByUserId, policyPath, response.Value.VersionId ?? "0");
        }
    }
}
