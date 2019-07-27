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
    public class AltinnAppsTests
    {
        [Fact]
        public void PDP_AuthorizeAccess_AltinnApps0001()
        {
            bool contextRequstIsEnriched = false;
            string testCase = "AltinnApps0001";

            XacmlContextResponse contextResponeExpected = XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            XacmlContextResponse xacmlResponse = SetuUpPolicyDecitionPoint(testCase, contextRequstIsEnriched, ClaimsPrincipalUtil.GetManagingDirectorPrincialForParty());

            AssertionUtil.AssertEqual(contextResponeExpected, xacmlResponse);
        }


        private XacmlContextResponse SetuUpPolicyDecitionPoint(string testCase, bool contextRequstIsEnriched, ClaimsPrincipal principal)
        {
            XacmlContextRequest contextRequest = XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetAltinnAppsPath());
            XacmlContextRequest contextRequestEnriched = contextRequest;
            if (contextRequstIsEnriched)
            {
                contextRequestEnriched = XacmlTestDataParser.ParseRequest(testCase + "Request_Enriched.xml", GetAltinnAppsPath());
            }

            XacmlPolicy policy = XacmlTestDataParser.ParsePolicy(testCase + "Policy.xml", GetAltinnAppsPath());

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
   

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnAppsTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }
    }
}
