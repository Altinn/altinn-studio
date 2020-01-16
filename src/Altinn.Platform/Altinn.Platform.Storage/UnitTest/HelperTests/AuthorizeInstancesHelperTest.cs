using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.HelperTests
{
    public class AuthorizeInstancesHelperTest
    {
        private const string org = "Altinn";
        private const string app = "App";
        private const string urnName = "urn:name";
        private const string urnAuthLv = "urn:altinn:authlevel";

        /// <summary>
        /// Test case: Send attributes and creates multiple request out of it 
        /// Expected: All values sent in will be created to attributes
        /// </summary>
        [Fact]
        public void CreateXacmlJsonMultipleRequest_TC01()
        {
            // Arrange
            List<string> actionTypes = new List<string> { "read", "write" };
            List<Instance> instances = CreateInstances();

            // Act
            XacmlJsonRequestRoot requestRoot = AuthorizationHelper.CreateMultiDecisionRequest(CreateUserClaims(), instances, actionTypes);

            // Assert
            // Checks it has the right number of attributes in each category 
            Assert.Single(requestRoot.Request.AccessSubject);
            Assert.Equal(2, requestRoot.Request.Action.Count());
            Assert.Equal(3, requestRoot.Request.Resource.Count());
            Assert.Equal(4, requestRoot.Request.Resource.First().Attribute.Count());
            Assert.Equal(6, requestRoot.Request.MultiRequests.RequestReference.Count());
            foreach (var refrenceId in requestRoot.Request.MultiRequests.RequestReference)
            {
                Assert.Equal(3, refrenceId.ReferenceId.Count());
            }
        }

        /// <summary>
        /// Test case: Send in user with claims that is null
        /// Expected: throws ArgumentNullException
        /// </summary>
        [Fact]
        public void CreateXacmlJsonMultipleRequest_TC02()
        {
            // Arrange
            List<string> actionTypes = new List<string> { "read", "write" };
            List<Instance> instances = CreateInstances();

            // Act & Assert 
            Assert.Throws<ArgumentNullException>(() => AuthorizationHelper.CreateMultiDecisionRequest(null, instances, actionTypes));
        }

        [Fact]
        public void AuthorizeMesseageBoxInstances_TC01()
        {

        }

        private ClaimsPrincipal CreateUserClaims()
        {
            // Create the user
            List<Claim> claims = new List<Claim>();

            // type, value, valuetype, issuer
            claims.Add(new Claim(urnName, "Ola", "string", "org"));
            claims.Add(new Claim(urnAuthLv, "2", "string", "org"));

            ClaimsPrincipal user = new ClaimsPrincipal(
                new ClaimsIdentity(
                        claims
                    ));

            return user;
        }

        private List<Instance> CreateInstances()
        {
            List<Instance> instances = new List<Instance>
            {
                new Instance
                {
                    Id = "1000/1",
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
                    Id = "1002/4",
                    InstanceOwner = new InstanceOwner
                    {
                        PartyId = "1002"
                    },
                    AppId = org + "/" + app,
                    Org = org
                },
                new Instance
                {
                    Id = "1000/7",
                    InstanceOwner = new InstanceOwner
                    {
                        PartyId = "1000"
                    },
                    AppId = org + "/" + app,
                    Org = org
                }
            };

            return instances;
        }
    }
}
