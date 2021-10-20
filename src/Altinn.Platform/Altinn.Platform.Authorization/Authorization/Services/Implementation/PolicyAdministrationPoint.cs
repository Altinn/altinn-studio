using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Azure;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Administration Point responsible for storing and modifying delegation policies
    /// </summary>
    public class PolicyAdministrationPoint : IPolicyAdministrationPoint
    {
        private readonly ILogger<IPolicyAdministrationPoint> _logger;
        private readonly IPolicyRetrievalPoint _prp;
        private readonly IPolicyRepository _policyRepository;
        private readonly IDelegationMetadataRepository _delegationRepository;
        private readonly IMemoryCache _memoryCache;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyAdministrationPoint"/> class.
        /// </summary>
        /// <param name="policyRetrievalPoint">The policy retrieval point</param>
        /// <param name="policyRepository">The policy repository (blob storage)</param>
        /// <param name="delegationRepository">The delegation change repository (postgresql)</param>
        /// <param name="memoryCache">The cache handler</param>
        /// <param name="settings">The app settings</param>
        /// <param name="logger">Logger instance</param>
        public PolicyAdministrationPoint(IPolicyRetrievalPoint policyRetrievalPoint, IPolicyRepository policyRepository, IDelegationMetadataRepository delegationRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings, ILogger<IPolicyAdministrationPoint> logger)
        {
            _prp = policyRetrievalPoint;
            _policyRepository = policyRepository;
            _delegationRepository = delegationRepository;
            _memoryCache = memoryCache;
            _generalSettings = settings.Value;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<bool> WritePolicyAsync(string org, string app, Stream fileStream)
        {
            if (fileStream == null)
            {
                throw new ArgumentException("The policy file can not be null");
            }

            string filePath = PolicyHelper.GetAltinnAppsPolicyPath(org, app);
            Response<BlobContentInfo> response = await _policyRepository.WritePolicyAsync(filePath, fileStream);

            return response?.GetRawResponse()?.Status == (int)HttpStatusCode.Created;
        }

        /// <inheritdoc/>
        public async Task<List<Rule>> TryWriteDelegationPolicyRules(List<Rule> rules)
        {
            List<Rule> result = new List<Rule>();
            Dictionary<string, List<Rule>> delegationDict = DelegationHelper.SortRulesByDelegationPolicyPath(rules, out List<Rule> unsortables);

            foreach (string delegationPolicypath in delegationDict.Keys)
            {
                bool writePolicySuccess = false;

                try
                {
                    writePolicySuccess = await WriteDelegationPolicyInternal(delegationPolicypath, delegationDict[delegationPolicypath]);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"An exception occured while processing authorization rules for delegation on delegation policy path: {delegationPolicypath}", delegationPolicypath);
                }                

                foreach (Rule rule in delegationDict[delegationPolicypath])
                {
                    if (writePolicySuccess)
                    {
                        rule.CreatedSuccessfully = true;
                        rule.Type = RuleType.DirectlyDelegated;
                    }

                    result.Add(rule);
                }
            }

            result.AddRange(unsortables);
            return result;
        }

        private async Task<bool> WriteDelegationPolicyInternal(string policyPath, List<Rule> rules)
        {
            if (!DelegationHelper.TryGetDelegationParamsFromRule(rules.First(), out string org, out string app, out int offeredByPartyId, out int? coveredByPartyId, out int? coveredByUserId, out int delegatedByUserId))
            {
                _logger.LogWarning($"This should not happen. Incomplete rule model received for delegation to delegation policy at: {policyPath}. Incomplete model should have been returned in unsortable rule set by TryWriteDelegationPolicyRules. DelegationHelper.SortRulesByDelegationPolicyPath might be broken.", policyPath);
                return false;
            }

            XacmlPolicy appPolicy = await _prp.GetPolicyAsync(org, app);
            if (appPolicy == null)
            {
                _logger.LogWarning($"No valid App policy found for delegation policy path: {policyPath}", policyPath);
                return false;
            }

            if (!await _policyRepository.PolicyExistsAsync(policyPath))
            {
                // Create a new empty blob for lease locking
                await _policyRepository.WritePolicyAsync(policyPath, new MemoryStream());
            }

            string leaseId = await _policyRepository.TryAcquireBlobLease(policyPath);
            if (leaseId != null)
            {
                try
                {
                    // Check for a current delegation change from postgresql
                    DelegationChange currentChange = await _delegationRepository.GetCurrentDelegationChange($"{org}/{app}", offeredByPartyId, coveredByPartyId, coveredByUserId);
                    XacmlPolicy existingDelegationPolicy = null;
                    if (currentChange != null && !currentChange.IsDeleted)
                    {
                        existingDelegationPolicy = await _prp.GetPolicyVersionAsync(policyPath, currentChange.BlobStorageVersionId);
                    }

                    // Build delegation XacmlPolicy either as a new policy or add rules to existing
                    XacmlPolicy delegationPolicy;
                    if (existingDelegationPolicy != null)
                    {
                        delegationPolicy = existingDelegationPolicy;
                        foreach (Rule rule in rules)
                        {
                            if (!DelegationHelper.PolicyContainsMatchingRule(delegationPolicy, rule))
                            {
                                delegationPolicy.Rules.Add(PolicyHelper.BuildDelegationRule(org, app, offeredByPartyId, coveredByPartyId, coveredByUserId, rule, appPolicy));
                            }
                        }
                    }
                    else
                    {
                        delegationPolicy = PolicyHelper.BuildDelegationPolicy(org, app, offeredByPartyId, coveredByPartyId, coveredByUserId, rules, appPolicy);
                    }       

                    // Write delegation policy to blob storage
                    MemoryStream dataStream = PolicyHelper.GetXmlMemoryStreamFromXacmlPolicy(delegationPolicy);
                    Response<BlobContentInfo> response = await _policyRepository.WritePolicyConditionallyAsync(policyPath, dataStream, leaseId);
                    if (response.GetRawResponse().Status != (int)HttpStatusCode.Created)
                    {
                        _logger.LogError($"Writing of delegation policy at path: {policyPath} failed. Is delegation blob storage account alive and well?", policyPath, response.GetRawResponse());
                        return false;
                    }

                    // Write delegation change to postgresql
                    bool postgreSuccess = await _delegationRepository.InsertDelegation($"{org}/{app}", offeredByPartyId, coveredByPartyId, coveredByUserId, delegatedByUserId, policyPath, response.Value.VersionId);
                    if (!postgreSuccess)
                    {
                        // Comment:
                        // This means that the current version of the root blob is no longer in sync with changes in authorization postgresql delegation.delegatedpolicy table.
                        // The root blob is in effect orphaned/ignored as the delegation policies are always to be read by version, and will be overritten by the next delegation change.
                        _logger.LogError($"Writing of delegation change to authorization postgresql database failed for changes to delegation policy at path: {policyPath}. is authorization postgresql database alive and well?", policyPath);
                        return false;
                    }

                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"An exception occured while processing authorization rules for delegation on delegation policy path: {policyPath}", policyPath);
                    return false;
                }
                finally
                {
                    _policyRepository.ReleaseBlobLease(policyPath, leaseId);
                }
            }

            _logger.LogInformation($"Could not acquire blob lease lock on delegation policy at path: {policyPath}", policyPath);
            return false;
        }
    }
}
