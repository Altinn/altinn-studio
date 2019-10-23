using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Repositories.Interface;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Retrieval point responsible to find the correct policy
    /// based on the context Request
    /// </summary>
    public class PolicyRetrievalPoint : IPolicyRetrievalPoint
    {
        private readonly string orgAttributeId = "urn:altinn:org";
        private readonly string appAttributeId = "urn:altinn:app";
        private readonly IPolicyRepository _repository;

        public PolicyRetrievalPoint(IPolicyRepository policyRepository)
        {
            _repository = policyRepository;
        }

        /*
        /// <summary>
        /// Returns a XACML Policy based on the Context Request
        /// </summary>
        /// <param name="request">The context request</param>
        /// <param name="org">the organization.</param>
        /// <param name="app">The application. </param>
        /// <returns></returns>
        public async XacmlPolicy GetPolicy(XacmlContextRequest request, string org = null, string app = null)
        {
            string filepath = (org != null && app != null) ? GetAltinnAppsPolicyPath(org, app) : GetPolicyPath(request);
            Stream policyStream = await _repository.GetPolicy(filepath);
            XacmlPolicy policy = new XacmlPolicy();
        }*/

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
                            foreach (var asff in asd.AttributeValues)
                            {
                                org = asff.Value;
                                break;
                            }
                        }

                        if (asd.AttributeId.OriginalString.Equals(appAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                app = asff.Value;
                                break;
                            }
                        }
                    }
                }
            }

            return GetAltinnAppsPolicyPath(org, app);
        }

        private string GetAltinnAppsPolicyPath(string org, string app)
        {
            return $"{org}/{app}/policy.xacml";
        }

        public XacmlPolicy GetPolicy(XacmlContextRequest request)
        {
            throw new NotImplementedException();
        }
    }
}
