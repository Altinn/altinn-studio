using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Xml;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class ContextHandler : IContextHandler
    {

        private readonly IHttpContextAccessor _httpContextAccessor;

        private readonly string OrgAttributeId = "urn:altinn:org";

        private readonly string AppAttributeId = "urn:altinn:app";

        private readonly string InstanceAttributeId = "urn:altinn:instance-id";

        private readonly string TaskAttributeId = "urn:altinn:task";

        private readonly string PartyAttributeId = "urn:altinn:partyid";


        public ContextHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public XacmlContextRequest Enrich(XacmlContextRequest request)
        {

            string testID = GetTestId(_httpContextAccessor.HttpContext);
            if (!string.IsNullOrEmpty(testID) && testID.ToLower().Contains("altinnapps"))
            {
                try
                {

                    return ParseRequest(testID + "Request_Enriched.xml", GetAltinnAppsPath());
                }
                catch(Exception)
                {

                }
            }
            else
            {
                try
                {

                    return ParseRequest(testID + "Request_Enriched.xml", GetConformancePath());
                }
                catch (Exception)
                {

                }
            }

            return request;
        }


        private void EnrichResourceAttributes(XacmlContextRequest request)
        {
            string orgAttributeValue = string.Empty;
            string appAttributeValue = string.Empty;
            string instanceAttributeValue = string.Empty;
            string resourcePartyAttributeValue = string.Empty;
            string taskAttributeValue = string.Empty;

            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();
      
            foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
            {
                if (attribute.AttributeId.OriginalString.Equals(OrgAttributeId))
                {
                    orgAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(AppAttributeId))
                {
                    appAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(InstanceAttributeId))
                {
                    instanceAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(TaskAttributeId))
                {
                    taskAttributeValue = attribute.AttributeValues.First().Value;
                }
            }

            if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                !string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                !string.IsNullOrEmpty(taskAttributeValue))
            {
                // The resource attributes are complete
                return;
            }
            else if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                string.IsNullOrEmpty(taskAttributeValue))
                {
                    // The resource attributes are complete
                    return;
                }
        }

        private string GetTestId(HttpContext context)
        {
           return context.Request.Headers["testcase"];
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }

        private string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\ConformanceTests");
        }

        public XacmlContextRequest ParseRequest(string requestDocumentTitle, string requestPath)
        {
            XmlDocument requestDocument = new XmlDocument();
            requestDocument.Load(Path.Combine(requestPath, requestDocumentTitle));
            XacmlContextRequest contextRequest;
            using (XmlReader reader = XmlReader.Create(new StringReader(requestDocument.OuterXml)))
            {
                contextRequest = XacmlParser.ReadContextRequest(reader);
            }

            return contextRequest;
        }


    }
}
