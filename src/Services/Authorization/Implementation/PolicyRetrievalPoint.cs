using System;
using System.IO;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using LocalTest.Configuration;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRetrievalPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        public PolicyRetrievalPoint(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc/>
        public Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            string policyPath = GetPolicyPath();
            return Task.FromResult(ParsePolicy(policyPath));
        }

        private string GetPolicyPath()
        {
            return _localPlatformSettings.AppRepsitoryBasePath + $"config/authorization/policy.xml";
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

        public Task<bool> WritePolicyAsync(string org, string app, Stream fileStream)
        {
            throw new NotImplementedException();
        }

    }
}
