using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;
using static Altinn.Authorization.ABAC.Constants.XacmlConstants;

namespace Altinn.Platform.Storage.UnitTest.HelperTests
{
    public class AuthorizeInstancesHelperTest
    {
        private const string org = "Altinn";
        private const string app = "App";
        private const string partyId = "1000";
        private const string urnName = "urn:name";
        private const string urnAuthLv = "urn:altinn:authlevel";
        private const string urnAction = MatchAttributeIdentifiers.ActionId;

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
            XacmlJsonRequestRoot requestRoot = AuthorizeInstancesHelper.CreateXacmlJsonMultipleRequest(CreateUserClaims(), instances, actionTypes);

            // Assert
            // Checks it has the right number of attributes in each category 
            Assert.Equal(6, requestRoot.Request.MultiRequests.RequestReference.Count());
            Assert.Single(requestRoot.Request.AccessSubject);
            Assert.Equal(2, requestRoot.Request.Action.Count());
            Assert.Equal(3, requestRoot.Request.Resource.Count());
            Assert.Equal(5, requestRoot.Request.Resource.First().Attribute.Count());
            // Check that it contains the correct information
            // Subject
            Assert.Equal(urnName, requestRoot.Request.AccessSubject[0].Attribute[0].AttributeId);
            Assert.Equal("Ola", requestRoot.Request.AccessSubject[0].Attribute[0].Value);
            Assert.Equal("string", requestRoot.Request.AccessSubject[0].Attribute[0].DataType);
            Assert.Equal("org", requestRoot.Request.AccessSubject[0].Attribute[0].Issuer);
            Assert.Equal(urnAuthLv, requestRoot.Request.AccessSubject[0].Attribute[1].AttributeId);
            Assert.Equal("2", requestRoot.Request.AccessSubject[0].Attribute[1].Value);
            Assert.Equal("string", requestRoot.Request.AccessSubject[0].Attribute[1].DataType);
            Assert.Equal("org", requestRoot.Request.AccessSubject[0].Attribute[1].Issuer);
            // Action
            Assert.Equal(urnAction, requestRoot.Request.Action[0].Attribute[0].AttributeId);
            Assert.Equal("read", requestRoot.Request.Action[0].Attribute[0].Value);
            Assert.Equal("string", requestRoot.Request.Action[0].Attribute[0].DataType);
            Assert.True(requestRoot.Request.Action[0].Attribute[0].IncludeInResult);
            Assert.Equal(urnAction, requestRoot.Request.Action[1].Attribute[0].AttributeId);
            Assert.Equal("write", requestRoot.Request.Action[1].Attribute[0].Value);
            Assert.Equal("string", requestRoot.Request.Action[1].Attribute[0].DataType);
            Assert.True(requestRoot.Request.Action[1].Attribute[0].IncludeInResult);
            // Resource
            Assert.Equal(AltinnXacmlUrns.InstanceId, requestRoot.Request.Resource[0].Attribute[0].AttributeId);
            Assert.Equal("1000/1", requestRoot.Request.Resource[0].Attribute[0].Value);
            Assert.True(requestRoot.Request.Resource[0].Attribute[0].IncludeInResult);
            Assert.Equal(AltinnXacmlUrns.InstanceId, requestRoot.Request.Resource[1].Attribute[0].AttributeId);
            Assert.Equal("1002/4", requestRoot.Request.Resource[1].Attribute[0].Value);
            Assert.True(requestRoot.Request.Resource[1].Attribute[0].IncludeInResult);
            Assert.Equal(AltinnXacmlUrns.InstanceId, requestRoot.Request.Resource[2].Attribute[0].AttributeId);
            Assert.Equal("1000/7", requestRoot.Request.Resource[2].Attribute[0].Value);
            Assert.True(requestRoot.Request.Resource[2].Attribute[0].IncludeInResult);
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
            Assert.Throws<ArgumentNullException>(() => AuthorizeInstancesHelper.CreateXacmlJsonMultipleRequest(null, instances, actionTypes));
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

            return instances;
        }
    }
}
