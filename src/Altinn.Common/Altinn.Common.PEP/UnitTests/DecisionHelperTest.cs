using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using Xunit;

namespace UnitTests
{
    public class DecisionHelperTest
    {
        private const string org = "Altinn";
        private const string app = "App";
        private const string actionType = "read";
        private const string partyId = "1000";

        public DecisionHelperTest()
        {

        }

        /// <summary>
        /// Test case: Send attributes and creates request out of it 
        /// Expected: All values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonRequest_TC01()
        {
            // Arrange & Act
            XacmlJsonRequest request = DecisionHelper.CreateXacmlJsonRequest(org, app, CreateUserClaims(false), actionType, partyId);

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
            XacmlJsonRequest request = DecisionHelper.CreateXacmlJsonRequest(org, app, CreateUserClaims(true), actionType, partyId);

            // Assert
            Assert.Equal(2, request.AccessSubject[0].Attribute.Count);
            Assert.Single(request.Action[0].Attribute);
            Assert.Equal(3, request.Resource[0].Attribute.Count);
        }

        private ClaimsPrincipal CreateUserClaims(bool addExtraClaim)
        {
            // Create the user
            List<Claim> claims = new List<Claim>();

            // type, value, valuetupe, issuer
            claims.Add(new Claim("urn:name", "Ola", "string", "org"));
            claims.Add(new Claim("urn:altinn:minimum-authenticationlevel", "2", "string", "org"));

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
