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

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRetrievalPoint"/> class.
        /// </summary>
        /// <param name="policyRepository">The policy Repository..</param>
        public PolicyRetrievalPoint(
            ILocalApp localApp)
        {
            _localApp = localApp;
        }

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            var app = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.AppAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault().Value;
            var org = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == XacmlRequestAttribute.OrgAttribute).Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault().Value;
            string policyString = await _localApp.GetXACMLPolicy($"{org}/{app}");
            return ParsePolicyContent(policyString);
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
