using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.HelperTests
{
    public class AuthorizeInstancesHelperTest
    {
        private const string org = "Altinn";
        private const string app = "App";
        private const string partyId = "1000";

        /// <summary>
        /// Test case: Send attributes and creates multiple request out of it 
        /// Expected: All values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonMultipleRequest_TC01()
        {
            // Arrange
            List<Instance> instances = new List<Instance>
            {
                new Instance
                {
                    Id = "1",
                    Process = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo
                        {
                            Name = "test_task"
                        }
                    },
                    InstanceOwner = new InstanceOwner
                    {
                        PartyId = "1000"
                    },
                    AppId = org + "/" + app,
                    Org = org
                },
                new Instance
                {
                    Id = "4",
                    InstanceOwner = new InstanceOwner
                    {
                        PartyId = "1002"
                    },
                    AppId = org + "/" + app,
                    Org = org
                },
                new Instance
                {
                    Id = "7",
                    InstanceOwner = new InstanceOwner
                    {
                        PartyId = "1000"
                    },
                    AppId = org + "/" + app,
                    Org = org
                }
            };

            // Act
            XacmlJsonRequestRoot requestRoot = AuthorizeInstancesHelper.CreateXacmlJsonMultipleRequest(CreateUserClaims(false), instances);

            // Assert
            Assert.Equal(6, requestRoot.Request.MultiRequests.RequestReference.Count());
            Assert.Single(requestRoot.Request.AccessSubject);
            Assert.Equal(2, requestRoot.Request.Action.Count());
            Assert.Equal(3, requestRoot.Request.Resource.Count());
            Assert.Equal(5, requestRoot.Request.Resource.First().Attribute.Count());
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
