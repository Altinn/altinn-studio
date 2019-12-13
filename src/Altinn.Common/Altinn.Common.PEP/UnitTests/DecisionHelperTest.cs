using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using Xunit;

namespace UnitTests
{
    public class DecisionHelperTest
    {
        private const string org = "Altinn";
        private const string app = "App";
        private const string actionType = "read";
        private const string partyId = "1000";

        /// <summary>
        /// Test case: Send attributes and creates request out of it 
        /// Expected: All values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonRequest_TC01()
        {
            // Arrange & Act
            XacmlJsonRequestRoot requestRoot = DecisionHelper.CreateDecisionRequest(org, app, CreateUserClaims(false), actionType, partyId, null);
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
            XacmlJsonRequestRoot requestRoot = DecisionHelper.CreateDecisionRequest(org, app, CreateUserClaims(true), actionType, partyId, null);
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

        private ClaimsPrincipal CreateUserClaims(bool addExtraClaim)
        {
            // Create the user
            List<Claim> claims = new List<Claim>();

            // type, value, valuetype, issuer
            claims.Add(new Claim("urn:name", "Ola", "string", "org"));
            claims.Add(new Claim("urn:altinn:authlevel", "2", "string", "org"));

            if (addExtraClaim)
            {
                claims.Add(new Claim("a", "a", "string", "a"));
            }

            ClaimsPrincipal user = new ClaimsPrincipal(
                new ClaimsIdentity(
                        claims
                    ));

            return user;
        }
    }
}
