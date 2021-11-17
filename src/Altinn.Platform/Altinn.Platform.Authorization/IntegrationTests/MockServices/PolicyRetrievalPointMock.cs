using System;
using System.IO;
using System.Threading.Tasks;
using System.Xml;

using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Services.Interface;
using Azure;
using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyRetrievalPointMock : IPolicyRetrievalPoint
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        private readonly string _orgAttributeId = "urn:altinn:org";

        private readonly string _appAttributeId = "urn:altinn:app";

        public PolicyRetrievalPointMock(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            string testID = GetTestId(_httpContextAccessor.HttpContext);
            if (!string.IsNullOrEmpty(testID) && testID.ToLower().Contains("altinnapps"))
            {
                if (File.Exists(Path.Combine(GetPolicyPath(request), "policy.xml")))
                {
                    return await Task.FromResult(ParsePolicy("policy.xml", GetPolicyPath(request)));
                }

                return await Task.FromResult(ParsePolicy(testID + "Policy.xml", GetAltinnAppsPath()));
            }
            else
            {
                return await Task.FromResult(ParsePolicy(testID + "Policy.xml", GetConformancePath()));
            }
        }

        public async Task<XacmlPolicy> GetPolicyAsync(string org, string app)
        {
            if (File.Exists(Path.Combine(GetAltinnAppsPolicyPath(org, app), "policy.xml")))
            {
                return await Task.FromResult(ParsePolicy("policy.xml", GetAltinnAppsPolicyPath(org, app)));
            }

            return null;
        }

        public async Task<XacmlPolicy> GetPolicyVersionAsync(string policyPath, string version)
        {
            string path = GetAltinnAppsDelegationPolicyPath(policyPath);
            if (File.Exists(path))
            {
                return await Task.FromResult(ParsePolicy(string.Empty, path));
            }

            return null;
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
                        if (asd.AttributeId.OriginalString.Equals(_orgAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                org = asff.Value;
                                break;
                            }
                        }

                        if (asd.AttributeId.OriginalString.Equals(_appAttributeId))
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
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/Xacml/3.0/AltinnApps/{org}/{app}/");
        }

        private static string GetAltinnAppsDelegationPolicyPath(string policyPath)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/blobs/input/{policyPath}");
        }

        private string GetTestId(HttpContext context)
        {
            return context.Request.Headers["testcase"];
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Xacml/3.0/AltinnApps");
        }

        private string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Xacml/3.0/ConformanceTests");
        }

        public static XacmlPolicy ParsePolicy(string policyDocumentTitle, string policyPath)
        {
            XmlDocument policyDocument = new XmlDocument();
            
            policyDocument.Load(Path.Combine(policyPath, policyDocumentTitle));
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }
    }
}
