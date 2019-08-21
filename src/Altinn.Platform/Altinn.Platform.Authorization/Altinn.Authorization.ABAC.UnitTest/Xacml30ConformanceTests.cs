using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.UnitTest.Utils;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Moq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Xml;
using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest
{
    public class Xacml30ConformanceTests
    {
        [Fact]
        public void PDP_AuthorizeAccess_IIA001()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA001";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA002()
        {
            bool contextRequstIsEnriched = true;
            string testCase = "IIA002";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA003()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA003";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA004()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA004";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA006()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA006";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA007()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA007";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }


        private XacmlContextResponse SetuUpPolicyDecisionPoint(string testCase, bool contextRequstIsEnriched)
        {
            XacmlContextRequest contextRequest = XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetConformancePath());
            XacmlContextRequest contextRequestEnriched = contextRequest;
            if (contextRequstIsEnriched)
            {
                contextRequestEnriched = XacmlTestDataParser.ParseRequest(testCase + "Request_Enriched.xml", GetConformancePath());
            }

            Moq.Mock<IContextHandler> moqContextHandler = new Mock<IContextHandler>();
            moqContextHandler.Setup(c => c.Enrich(It.IsAny<XacmlContextRequest>())).Returns(contextRequestEnriched);
            
            Moq.Mock<IPolicyRetrievalPoint> moqPRP = new Mock<IPolicyRetrievalPoint>();

            try
            {
                XacmlPolicy policy = XacmlTestDataParser.ParsePolicy(testCase + "Policy.xml", GetConformancePath());
                moqPRP.Setup(p => p.GetPolicy(It.IsAny<XacmlContextRequest>())).Returns(policy);
            }
            catch(XmlException ex)
            {
                moqPRP.Setup(p => p.GetPolicy(It.IsAny<XacmlContextRequest>())).Throws(ex);
            }

            PolicyDecisionPoint pdp = new PolicyDecisionPoint(moqContextHandler.Object, moqPRP.Object);

            XacmlContextResponse xacmlResponse = pdp.Authorize(contextRequest);

            return xacmlResponse;
        }
   

        private string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnAppsTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\ConformanceTests");
        }
    }
}
