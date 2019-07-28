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
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched, null);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA002()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA002";

            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim("urn:oasis:names:tc:xacml:1.0:example:attribute:role", "Physician", ClaimValueTypes.String, "Altinn"));

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched, ClaimsPrincipalUtil.GetUserWithClaims(1,claims));

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        [Fact]
        public void PDP_AuthorizeAccess_IIA003()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "IIA003";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecisionPoint(testCase, contextRequstIsEnriched, null);

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }

        private XacmlContextResponse SetuUpPolicyDecisionPoint(string testCase, bool contextRequstIsEnriched, ClaimsPrincipal principal)
        {
            XacmlContextRequest contextRequest = XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetConformancePath());
            XacmlContextRequest contextRequestEnriched = contextRequest;
            if (contextRequstIsEnriched)
            {
                contextRequestEnriched = XacmlTestDataParser.ParseRequest(testCase + "Request_Enriched.xml", GetConformancePath());
            }

            XacmlPolicy policy = XacmlTestDataParser.ParsePolicy(testCase + "Policy.xml", GetConformancePath());

            Moq.Mock<IContextHandler> moqContextHandler = new Mock<IContextHandler>();
            moqContextHandler.Setup(c => c.UpdateContextRequest(It.IsAny<XacmlContextRequest>())).Returns(contextRequestEnriched);

            Moq.Mock<IPolicyInformationPoint> moqPip = new Mock<IPolicyInformationPoint>();
            moqPip.Setup(m => m.GetClaimsPrincipal(It.IsAny<XacmlContextRequest>())).Returns(principal);

            Moq.Mock<IPolicyRetrievalPoint> moqPRP = new Mock<IPolicyRetrievalPoint>();
            moqPRP.Setup(p => p.GetPolicy(It.IsAny<XacmlContextRequest>())).Returns(policy);

            PolicyDecisionPoint pdp = new PolicyDecisionPoint(moqContextHandler.Object, moqPRP.Object, moqPip.Object);

            XacmlContextResponse xacmlResponse = pdp.AuthorizeAccess(contextRequest);

            return xacmlResponse;
        }
   

        private string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnAppsTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\ConformanceTests");
        }
    }
}
