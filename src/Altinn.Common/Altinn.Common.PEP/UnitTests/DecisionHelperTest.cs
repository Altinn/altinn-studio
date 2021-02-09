using System;
using System.Collections.Generic;
using System.Security.Claims;

using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Models;

using Xunit;

namespace UnitTests
{
    public class DecisionHelperTest
    {
        private const string Org = "Altinn";
        private const string App = "App";
        private const string ActionType = "read";
        private const int PartyId = 1000;

        /// <summary>
        /// Test case: Send attributes and creates request out of it 
        /// Expected: All values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonRequest_TC01()
        {
            // Arrange & Act
            XacmlJsonRequestRoot requestRoot = DecisionHelper.CreateDecisionRequest(Org, App, CreateUserClaims(false), ActionType, PartyId, null);
            XacmlJsonRequest request = requestRoot.Request;

            // Assert
            Assert.Equal(2, request.AccessSubject[0].Attribute.Count);
            Assert.Single(request.Action[0].Attribute);
            Assert.Equal(3, request.Resource[0].Attribute.Count);
        }

        /// <summary>
        /// Test case: Send attributes and creates request out of it 
        /// Expected: Only valid urn values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonRequest_TC02()
        {
            // Arrange & Act
            XacmlJsonRequestRoot requestRoot = DecisionHelper.CreateDecisionRequest(Org, App, CreateUserClaims(true), ActionType, PartyId, null);
            XacmlJsonRequest request = requestRoot.Request;

            // Assert
            Assert.Equal(2, request.AccessSubject[0].Attribute.Count);
            Assert.Single(request.Action[0].Attribute);
            Assert.Equal(3, request.Resource[0].Attribute.Count);
        }

        /// <summary>
        /// Test case: Response with result permit
        /// Expected: Returns true
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC01()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Act
            bool result = DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false));

            // Assert
            Assert.True(result);
        }

        /// <summary>
        /// Test case: Respons contains obligation with min authentication level that the user meets
        /// Expected: Returns true
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC02()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = "2"
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);
            xacmlJsonResult.Obligations = new List<XacmlJsonObligationOrAdvice>();
            xacmlJsonResult.Obligations.Add(obligation);

            // Act
            bool result = DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false));

            // Assert
            Assert.True(result);
        }

        /// <summary>
        /// Test case: Respons contains obligation with min authentication level that the user do not meet
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC03()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = "3"
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);
            xacmlJsonResult.Obligations = new List<XacmlJsonObligationOrAdvice>();
            xacmlJsonResult.Obligations.Add(obligation);

            // Act
            bool result = DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false));

            // Assert
            Assert.False(result);
        }

        /// <summary>
        /// Test case: Respons with result deny
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC04()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Deny.ToString();
            response.Response.Add(xacmlJsonResult);

            // Act
            bool result = DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false));

            // Assert
            Assert.False(result);
        }

        /// <summary>
        /// Test case: Respons with two results
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC05()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);
            response.Response.Add(new XacmlJsonResult());

            // Act
            bool result = DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false));

            // Assert
            Assert.False(result);
        }

        /// <summary>
        /// Test case: Result list is null
        /// Expected: Throws ArgumentNullException
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC06()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = null;

            // Act & Assert
            Assert.Throws<ArgumentNullException>(() => DecisionHelper.ValidatePdpDecision(response.Response, CreateUserClaims(false)));
        }

        /// <summary>
        /// Test case: User is null
        /// Expected: Throws ArgumentNullException
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC07()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();

            // Act & Assert
            Assert.Throws<ArgumentNullException>(() => DecisionHelper.ValidatePdpDecision(response.Response, null));
        }

        /// <summary>
        /// Test case: Response contains obligation with min authentication level that the user do not meet, get detailed response
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC08()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            string minAuthLevel = "3";
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = minAuthLevel
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);
            xacmlJsonResult.Obligations = new List<XacmlJsonObligationOrAdvice>();
            xacmlJsonResult.Obligations.Add(obligation);

            // Act
            EnforcementResult result = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, CreateUserClaims(false));

            // Assert
            Assert.False(result.Authorized);
            Assert.Contains(AltinnObligations.RequiredAuthenticationLevel, result.FailedObligations.Keys);
            Assert.Equal(minAuthLevel, result.FailedObligations[AltinnObligations.RequiredAuthenticationLevel]);
        }

        /// <summary>
        /// Test case: Response contains obligation with min authentication level that the user do not meet, get detailed response
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC09()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            string minAuthLevel = "4";
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = minAuthLevel
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);

            XacmlJsonObligationOrAdvice obligationOrg = new XacmlJsonObligationOrAdvice();
            obligationOrg.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            string minAuthLevelOrg = "2";
            XacmlJsonAttributeAssignment authenticationAttributeOrg = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = minAuthLevelOrg
            };
            obligationOrg.AttributeAssignment.Add(authenticationAttributeOrg);

            xacmlJsonResult.Obligations = new List<XacmlJsonObligationOrAdvice>();
            xacmlJsonResult.Obligations.Add(obligation);
            xacmlJsonResult.Obligations.Add(obligationOrg);

            // Act
            EnforcementResult result = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, CreateUserClaims(false));

            // Assert
            Assert.False(result.Authorized);
            Assert.Contains(AltinnObligations.RequiredAuthenticationLevel, result.FailedObligations.Keys);
            Assert.Equal(minAuthLevel, result.FailedObligations[AltinnObligations.RequiredAuthenticationLevel]);
        }

        /// <summary>
        /// Test case: Response contains obligation with min authentication level that the user do not meet, get detailed response
        /// Expected: Returns false
        /// </summary>
        [Fact]
        public void ValidatePdpDecision_TC10()
        {
            // Arrange
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult xacmlJsonResult = new XacmlJsonResult();
            xacmlJsonResult.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(xacmlJsonResult);

            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            string minAuthLevel = "4";
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = minAuthLevel
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);

            XacmlJsonObligationOrAdvice obligationOrg = new XacmlJsonObligationOrAdvice();
            obligationOrg.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            string minAuthLevelOrg = "2";
            XacmlJsonAttributeAssignment authenticationAttributeOrg = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel-org",
                Value = minAuthLevelOrg
            };
            obligationOrg.AttributeAssignment.Add(authenticationAttributeOrg);

            xacmlJsonResult.Obligations = new List<XacmlJsonObligationOrAdvice>();
            xacmlJsonResult.Obligations.Add(obligationOrg);
            xacmlJsonResult.Obligations.Add(obligation);

            // Act
            EnforcementResult result = DecisionHelper.ValidatePdpDecisionDetailed(response.Response, CreateUserClaims(false, "ttd"));

            // Assert
            Assert.True(result.Authorized);
            Assert.Null(result.FailedObligations);
        }

        private ClaimsPrincipal CreateUserClaims(bool addExtraClaim, string org = null)
        {
            // Create the user
            List<Claim> claims = new List<Claim>();

            // type, value, valuetype, issuer
            claims.Add(new Claim("urn:altinn:authlevel", "2", "string", "org"));
            if (org != null)
            {
                claims.Add(new Claim("urn:altinn:org", org, "string", "org"));
            }
            else
            {
                claims.Add(new Claim("urn:name", "Ola", "string", "org"));
            }

            if (addExtraClaim)
            {
                claims.Add(new Claim("a", "a", "string", "a"));
            }

            ClaimsPrincipal user = new ClaimsPrincipal(new ClaimsIdentity(claims));
            return user;
        }
    }
}
