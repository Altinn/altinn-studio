using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
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

        /// <inheritdoc/>
        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            string policyPath = GetPolicyPath(request);
            Stream policyStream = await _repository.GetPolicyAsync(policyPath);

            return (policyStream != null) ? ParsePolicy(policyStream) : null; 
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

            if (!PolicyFileContainsAppAndOrgAttributes(fileStream))
            {
                throw new ArgumentException("The policy file must contain org and app attributes");
            }

            //XacmlPolicy xacmlPolicy = ParsePolicy(fileStream);

            string filePath = GetAltinnAppsPolicyPath(org, app);
            return await _repository.WritePolicyAsync(filePath, fileStream);
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

            if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(app))
            {
                throw new ArgumentException();
            }

            return GetAltinnAppsPolicyPath(org, app);
        }

        private string GetAltinnAppsPolicyPath(string org, string app)
        {
            return $"{org}/{app}/policy.xacml";
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

        private bool PolicyFileContainsAppAndOrgAttributes(Stream stream)
        {
            StreamReader sr = new StreamReader(stream);
            bool orgAttribute = false;
            bool appAttribute = false;
            string line;

            while ((line = sr.ReadLine()) != null)
            {
                if (line.Contains("urn:altinn:org"))
                {
                    orgAttribute = true;
                }

                if (line.Contains("urn:altinn:app"))
                {
                    appAttribute = true;
                }

                if (orgAttribute && appAttribute)
                {
                    stream.Position = 0;
                    return true;
                }
            }

            stream.Position = 0;
            sr.Close();

            return false;
        }
    }
}
