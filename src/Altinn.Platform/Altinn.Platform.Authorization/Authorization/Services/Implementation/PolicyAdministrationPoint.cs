using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Helpers.Extensions;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Administration Point responsible for storing and modifying delegation policies
    /// </summary>
    public class PolicyAdministrationPoint : IPolicyAdministrationPoint
    {
        private readonly string orgAttributeId = "urn:altinn:org";
        private readonly string appAttributeId = "urn:altinn:app";
        private readonly IPolicyRepository _repository;
        private readonly IMemoryCache _memoryCache;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyAdministrationPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        /// <param name="memoryCache">The cache handler </param>
        /// <param name="settings">The app settings</param>
        public PolicyAdministrationPoint(IPolicyRepository policyRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
        {
            _repository = policyRepository;
            _memoryCache = memoryCache;
            _generalSettings = settings.Value;
        }

        /// <inheritdoc/>
        public Task<bool> WritePolicyAsync(string org, string app, Stream fileStream)
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

            return WritePolicyInternalAsync(org, app, fileStream);
        }

        /// <inheritdoc/>
        Task<XacmlPolicy> IPolicyAdministrationPoint.GetDelegationPolicy(string org, string app, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        Task<bool> IPolicyAdministrationPoint.WriteDelegationPolicy(string org, string app, int offeredByPartyId, int coveredByPartyId, int coveredByUserId, int delegatedByUserId, Stream fileStream)
        {
            throw new NotImplementedException();
        }

        private async Task<bool> WritePolicyInternalAsync(string org, string app, Stream fileStream)
        {
            string filePath = GetAltinnAppsPolicyPath(org, app);
            return await _repository.WritePolicyAsync(filePath, fileStream);
        }

        private async Task<XacmlPolicy> GetPolicyInternalAsync(string policyPath)
        {
            XacmlPolicy policy;
            using (Stream policyStream = await _repository.GetPolicyAsync(policyPath))
            {
                policy = (policyStream.Length > 0) ? ParsePolicy(policyStream) : null;
            }

            return policy;
        }

        private string GetPolicyPath(XacmlContextRequest request)
        {
            string org = string.Empty;
            string app = string.Empty;

            foreach (XacmlContextAttributes attr in request.Attributes)
            {
                if (attr.Category.OriginalString.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                {
                    foreach (XacmlAttribute asd in attr.Attributes)
                    {
                        if (asd.AttributeId.OriginalString.Equals(orgAttributeId))
                        {
                            org = asd.AttributeValues.FirstOrDefault().Value;
                        }

                        if (asd.AttributeId.OriginalString.Equals(appAttributeId))
                        {
                            app = asd.AttributeValues.FirstOrDefault().Value;
                        }
                    }
                }
            }

            return GetAltinnAppsPolicyPath(org, app);
        }

        private string GetAltinnAppsPolicyPath(string org, string app)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException("Org was not defined");
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException("App was not defined");
            }

            return $"{org.AsFileName()}/{app.AsFileName()}/policy.xml";
        }

        private static XacmlPolicy ParsePolicy(Stream stream)
        {
            stream.Position = 0;
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(stream))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }
    }
}
