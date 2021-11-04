using System;
using System.IO;

using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.UnitTest.Utils;
using Altinn.Authorization.ABAC.Xacml;

using Moq;

using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest
{
    public class AltinnAppsTests
    {
        [Fact]
        public void PDP_AuthorizeAccess_AltinnApps0001()
        {
            bool contextRequstIsEnriched = true;
            string testCase = "AltinnApps0001";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_AltinnApps0002()
        {
            bool contextRequstIsEnriched = true;
            string testCase = "AltinnApps0002";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_AltinnApps0003()
        {
            bool contextRequstIsEnriched = true;
            string testCase = "AltinnApps0003";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        private XacmlContextResponse SetuUpPolicyDecisionPoint(string testCase, bool contextRequstIsEnriched)
        {
            XacmlContextRequest contextRequest = XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetAltinnAppsPath());
            XacmlContextRequest contextRequestEnriched = contextRequest;
            if (contextRequstIsEnriched)
            {
                contextRequestEnriched = XacmlTestDataParser.ParseRequest(testCase + "Request_Enriched.xml", GetAltinnAppsPath());
            }

            XacmlPolicy policy = XacmlTestDataParser.ParsePolicy(testCase + "Policy.xml", GetAltinnAppsPath());

            Moq.Mock<IContextHandler> moqContextHandler = new Mock<IContextHandler>();
            moqContextHandler.Setup(c => c.Enrich(It.IsAny<XacmlContextRequest>())).ReturnsAsync(contextRequestEnriched);

            PolicyDecisionPoint pdp = new PolicyDecisionPoint();

            XacmlContextResponse xacmlResponse = pdp.Authorize(contextRequestEnriched, policy);

            return xacmlResponse;
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnAppsTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }
    }
}
