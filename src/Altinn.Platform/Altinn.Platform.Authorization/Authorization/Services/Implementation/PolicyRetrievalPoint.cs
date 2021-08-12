using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.Helpers.Extensions;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Retrieval point responsible to find the correct policy
    /// based on the context Request
    /// </summary>
    public class PolicyRetrievalPoint : IPolicyRetrievalPoint
    {
        private readonly IPolicyRepository _repository;
        private readonly IMemoryCache _memoryCache;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRetrievalPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        /// <param name="memoryCache">The cache handler </param>
        /// <param name="settings">The app settings</param>
        public PolicyRetrievalPoint(IPolicyRepository policyRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
        {
            _repository = policyRepository;
            _memoryCache = memoryCache;
            _generalSettings = settings.Value;
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            string policyPath = PolicyHelper.GetPolicyPath(request);
            if (!_memoryCache.TryGetValue(policyPath, out XacmlPolicy policy))
            {
                // Key not in cache, so get data.
                using (Stream policyStream = await _repository.GetPolicyAsync(policyPath))
                {
                    policy = (policyStream.Length > 0) ? PolicyHelper.ParsePolicy(policyStream) : null;
                }

                var cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, _generalSettings.PolicyCacheTimeout, 0));

                _memoryCache.Set(policyPath, policy, cacheEntryOptions);
            }

            return policy;
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(string org, string app)
        {
            // ToDo: Wrap in IMemoryCache use?
            string policyPath = PolicyHelper.GetAltinnAppsPolicyPath(org, app);
            return await GetPolicyInternalAsync(policyPath);
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetDelegationPolicyAsync(string org, string app, string offeredBy, string coveredBy)
        {
            // ToDo: Wrap in IMemoryCache use?
            string policyPath = PolicyHelper.GetAltinnAppDelegationPolicyPath(org, app, offeredBy, coveredBy);
            return await GetPolicyInternalAsync(policyPath);
        }

        private async Task<XacmlPolicy> GetPolicyInternalAsync(string policyPath)
        {
            XacmlPolicy policy;
            using (Stream policyStream = await _repository.GetPolicyAsync(policyPath))
            {
                policy = (policyStream.Length > 0) ? PolicyHelper.ParsePolicy(policyStream) : null;
            }

            return policy;
        }        
    }
}
