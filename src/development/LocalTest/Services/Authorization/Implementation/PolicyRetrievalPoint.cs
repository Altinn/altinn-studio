using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using LocalTest.Configuration;
using LocalTest.Services.Authorization.Interface;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.Localtest.Interface;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Retrieval point responsible to find the correct policy
    /// based on the context Request
    /// </summary>
    public class PolicyRetrievalPoint : IPolicyRetrievalPoint
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly ILocalTestAppSelection _localTestAppSelectionService;
        private readonly ILocalApp _localApp;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRetrievalPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        public PolicyRetrievalPoint(
            IOptions<LocalPlatformSettings> localPlatformSettings,
            ILocalTestAppSelection localTestAppSelectionService,
            ILocalApp localApp)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _localTestAppSelectionService = localTestAppSelectionService;
            _localApp = localApp;
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            var appId = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.AppAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault().Value;
            string policyPath = await _localApp.GetXACMLPolicy(appId);
            return ParsePolicyContent(policyPath);
        }

        /// <inheritdoc/>
        public Task<XacmlPolicy> GetPolicyAsync(string org, string app)
        {
            throw new NotImplementedException();
        }
              
        public static XacmlPolicy ParsePolicyContent(string policyContent)
        {
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyContent)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        public Task<bool> WritePolicyAsync(string org, string app, Stream fileStream)
        {
            throw new NotImplementedException();
        }
    }
}
