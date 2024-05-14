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
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Retrieval point responsible to find the correct policy
    /// based on the context Request
    /// </summary>
    public class PolicyRetrievalPoint : IPolicyRetrievalPoint
    {
        private readonly ILocalApp _localApp;
        private readonly LocalPlatformSettings _localPlatformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRetrievalPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        public PolicyRetrievalPoint(
            ILocalApp localApp, IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localApp = localApp;
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            string app = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.AppAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault()?.Value;
            string org = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.OrgAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault()?.Value;
            string resourceRegistry = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.ResourceRegistryAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault()?.Value;

            if (app != null && org != null)
            {
                string policyString = await _localApp.GetXACMLPolicy($"{org}/{app}");
                policyString = policyString
                    .Replace("[org]", org)
                    .Replace("[ORG]", org)
                    .Replace("[app]", app)
                    .Replace("[APP]", app);
                return ParsePolicyContent(policyString);
            }
            else
            {
                return ParsePolicy(GetResourcePolicyPath(resourceRegistry));
            }
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

        private string GetResourcePolicyPath(string resourceId)
        {
            return Path.Join(_localPlatformSettings.LocalTestingStaticTestDataPath, _localPlatformSettings.ResourceRegistryFolder,"policies", $"{resourceId}.xml");
        }

        public static XacmlPolicy ParsePolicy(string policyPath)
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(policyPath);
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }
    }
}
