using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyControllerTest : IClassFixture<PolicyRetrievalPointFixture>
    {
        private readonly HttpClient _client;
        private readonly PolicyRetrievalPointFixture _fixture;

        public PolicyControllerTest(PolicyRetrievalPointFixture fixture)
        {
            _fixture = fixture;
            _client = _fixture.GetClient();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("appliation/xml"));
        }

        /// <summary>
        /// Test case: Write a xml file to storage.
        /// Expected: WritePolicyAsync returns true and status code 200.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/skd/taxreport/policy.xml");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?org=org&app=app", content);

            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: Write a json file to storage.
        /// Expected: WritePolicyAsync returns true and status code 200.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC02()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/AltinnApps0009Request.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?org=org&app=app", content);

            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: Write to storage a file that is null. 
        /// Expected: GetPolicyAsync returns status code 500.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC03()
        {
            string token = PrincipalUtil.GetAccessToken("studio.designer");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Arrange & Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?org=org&app=app", null);
            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Test case: Write a xml file to storage where org query string is not set.
        /// Expected: WritePolicyAsync returns status code 500. 
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/AltinnApps0009Request.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?app=app", content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Test case: Write a xml file to storage where app query string is not set.
        /// Expected: WritePolicyAsync returns status code 500. 
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC05()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/skd/taxreport/policy.xml");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?org=org", content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Test case: Write a json file to storage with incorrect claims in designer token
        /// Expected: WritePolicyAsync returns 401
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC06()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/AltinnApps0009Request.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            string token = PrincipalUtil.GetAccessToken("studio.desi2gner");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies?org=org&app=app", content);

            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: GetRolesWithAccess happy path
        /// Expected: GetRolesWithAccess returns 200 with list of roles
        /// </summary>
        [Fact]
        public async Task GetRolesWithAccess_TC01()
        {
            // Arrange
            string org = "skd";
            string app = "taxreport";

            // Act
            HttpResponseMessage response = await _client.GetAsync($"authorization/api/v1/policies/roleswithaccess/{org}/{app}");
            string responseContent = await response.Content.ReadAsStringAsync();
            List<string> roleCodes = (List<string>)JsonConvert.DeserializeObject(responseContent, typeof(List<string>));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(2, roleCodes.Count);
            Assert.Contains("regna", roleCodes);
            Assert.Contains("dagl", roleCodes);
        }

        /// <summary>
        /// Test case: Trying to get roles for an non-existing app
        /// Expected: GetRolesWithAccess returns 404
        /// </summary>
        [Fact]
        public async Task GetRolesWithAccess_TC02()
        {
            // Arrange
            string org = "doesntexisit";
            string app = "doesntexisit";

            // Act
            HttpResponseMessage response = await _client.GetAsync($"authorization/api/v1/policies/roleswithaccess/{org}/{app}");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// Test case: Trying to get roles without org
        /// Expected: GetRolesWithAccess returns 400
        /// </summary>
        [Fact]
        public async Task GetRolesWithAccess_TC03()
        {
            // Arrange
            string org = " ";
            string app = "doesntexisit";

            // Act
            HttpResponseMessage response = await _client.GetAsync($"authorization/api/v1/policies/roleswithaccess/{org}/{app}");

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Test case: GetRolesWithAccess returns empty list when no roles in policy
        /// Expected: GetRolesWithAccess returns 200 with empty list
        /// </summary>
        [Fact]
        public async Task GetRolesWithAccess_TC04()
        {
            // Arrange
            string org = "testorg";
            string app = "testapp";

            // Act
            HttpResponseMessage response = await _client.GetAsync($"authorization/api/v1/policies/roleswithaccess/{org}/{app}");
            string responseContent = await response.Content.ReadAsStringAsync();
            List<string> roleCodes = (List<string>)JsonConvert.DeserializeObject(responseContent, typeof(List<string>));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(roleCodes);
        }

        /// <summary>
        /// Test case: GetResourcepolicies returns a list of ResourcePolicy
        /// Expected: GetResourcepolicies returns a list of ResourcePolicy that contains 3 ResourcePolicies and several actions
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_TC05()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/SKDTaxReport2Request.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<ResourcePolicyResponse> expectedResourcePolicyResponses = new List<ResourcePolicyResponse>
            {
               new ResourcePolicyResponse
               {
                   AppId = new List<AttributeMatch>
                   {
                      new AttributeMatch { Id = XacmlRequestAttribute.OrgAttribute, Value = "SKD" },
                      new AttributeMatch { Id = XacmlRequestAttribute.AppAttribute, Value = "TaxReport2" },
                   },
                   ResourcePolicies = GetResourcePoliciesForSKDTaxReport(),
                   MinimumAuthenticationLevel = 2
               }
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            AssertionUtil.AssertCollections(expectedResourcePolicyResponses, actualResourcePolicyResponses, AssertionUtil.AssertResourcePolicyResponseEqual);
        }

        /// <summary>
        /// Test case: Try GetResourcePolicies with an invalid list of org/app Attributematches
        /// Expected: GetResourcepolicies returns a ResoucrcePolicyResponse with a "not found" errormessage
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_InvalidApp_TC06()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/SKDInvalidAppRequest.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<ResourcePolicyResponse> expectedResourcePolicyResponses = new List<ResourcePolicyResponse>
            {
               new ResourcePolicyResponse
               {
                   AppId = new List<AttributeMatch>
                   {
                      new AttributeMatch { Id = XacmlRequestAttribute.OrgAttribute, Value = "SKD" },
                      new AttributeMatch { Id = XacmlRequestAttribute.AppAttribute, Value = "InvalidApp" },
                   },
                   ErrorResponse = "No valid policy found for org 'SKD' and app 'InvalidApp'"
               }
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            AssertionUtil.AssertCollections(expectedResourcePolicyResponses, actualResourcePolicyResponses, AssertionUtil.AssertResourcePolicyResponseEqual);
        }

        /// <summary>
        /// Test case: Try GetResourcePolicies without an app Attributematch
        /// Expected: GetResourcepolicies returns a ResoucrcePolicyResponse with an "app must be defined" errormessage
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_NoApp_TC07()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/SKDMissingAppRequest.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<ResourcePolicyResponse> expectedResourcePolicyResponses = new List<ResourcePolicyResponse>
            {
               new ResourcePolicyResponse
               {
                   AppId = new List<AttributeMatch>
                   {
                      new AttributeMatch { Id = XacmlRequestAttribute.OrgAttribute, Value = "SKD" }
                   },
                   ErrorResponse = "App must be defined in the path"
               }
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            AssertionUtil.AssertCollections(expectedResourcePolicyResponses, actualResourcePolicyResponses, AssertionUtil.AssertResourcePolicyResponseEqual);
        }

        /// <summary>
        /// Test case: Try GetResourcePolicies without an org Attributematch
        /// Expected: GetResourcepolicies returns a ResoucrcePolicyResponse with an "Organisation must be defined" errormessage
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_NoOrg_TC08()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/SKDMissingOrgRequest.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<ResourcePolicyResponse> expectedResourcePolicyResponses = new List<ResourcePolicyResponse>
            {
               new ResourcePolicyResponse
               {
                   AppId = new List<AttributeMatch>
                   {
                      new AttributeMatch { Id = XacmlRequestAttribute.AppAttribute, Value = "TaxReport2" }
                   },
                   ErrorResponse = "Organisation must be defined in the path"
               }
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            AssertionUtil.AssertCollections(expectedResourcePolicyResponses, actualResourcePolicyResponses, AssertionUtil.AssertResourcePolicyResponseEqual);
        }

        /// <summary>
        /// Test case: Try GetResourcepolicies where a ResourcePolicy exists in blobstorage, but does not match the Org/App in the request
        /// Expected: GetResourcepolicies returns a list of 
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_TC09()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/SKDUndefinedRequest.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<ResourcePolicyResponse> expectedResourcePolicyResponses = new List<ResourcePolicyResponse>
            {
               new ResourcePolicyResponse
               {
                   AppId = new List<AttributeMatch>
                   {
                      new AttributeMatch { Id = XacmlRequestAttribute.OrgAttribute, Value = "SKD" },
                      new AttributeMatch { Id = XacmlRequestAttribute.AppAttribute, Value = "undefined" },
                   },
                   ResourcePolicies = new List<ResourcePolicy>(),
                   MinimumAuthenticationLevel = 4
               }
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            AssertionUtil.AssertCollections(expectedResourcePolicyResponses, actualResourcePolicyResponses, AssertionUtil.AssertResourcePolicyResponseEqual);
        }

        /// <summary>
        /// Test case: Try GetResourcePolicies for app with rule for Org subject in XACML app policy
        /// Expected: Rules not associated with a RoleCode should be ignored in the Resource Policy
        /// </summary>
        [Fact]
        public async Task GetResourcePoliciesFromXacmlPolicies_IgnoresXacmlRules_WithOrgSubject()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/GetResourcePolicies/Org2App2Request.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/GetPolicies", content);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ResourcePolicyResponse> actualResourcePolicyResponses = JsonConvert.DeserializeObject<List<ResourcePolicyResponse>>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(!actualResourcePolicyResponses.Any(rpr => rpr.ResourcePolicies.Any(rp => rp.Actions.Any(action => action.Title == "appownerread" || action.RoleGrants.Count == 0))));
        }

        private static List<ResourcePolicy> GetResourcePoliciesForSKDTaxReport()
        {
            string policyDesc = "Eksempel på en policy";
            ResourcePolicy instantiatePolicy = TestDataHelper.GetResourcePolicyModel("SKD", "TaxReport2", task: "Instansiate");
            instantiatePolicy.Actions = new List<ResourceAction>();
            instantiatePolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Read", new string[] { "REGNA", "DAGL" }));
            instantiatePolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Write", new string[] { "REGNA", "DAGL" }));
            instantiatePolicy.Description = policyDesc;

            ResourcePolicy formFillingPolicy = TestDataHelper.GetResourcePolicyModel("SKD", "TaxReport2", task: "FormFilling");
            formFillingPolicy.Actions = new List<ResourceAction>();
            formFillingPolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Read", new string[] { "REGNA", "DAGL" }));
            formFillingPolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Write", new string[] { "REGNA", "DAGL" }));
            formFillingPolicy.Description = policyDesc;

            ResourcePolicy signingPolicy = TestDataHelper.GetResourcePolicyModel("SKD", "TaxReport2", endEvent: "Signing");
            signingPolicy.Actions = new List<ResourceAction>();
            signingPolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Read", new string[] { "REGNA", "DAGL" }));
            signingPolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Write", new string[] { "REGNA", "DAGL" }));
            signingPolicy.Actions.Add(TestDataHelper.GetResourceActionModel("Sign", new string[] { "DAGL", "PRIV", "PRIV2" }));
            signingPolicy.Description = policyDesc;

            List<ResourcePolicy> policies = new List<ResourcePolicy>();
            policies.Add(instantiatePolicy);
            policies.Add(formFillingPolicy);
            policies.Add(signingPolicy);

            return policies;
        }
    }
}
