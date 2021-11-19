using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("DelegationController Tests")]
    public class DelegationsControllerTest : IClassFixture<PolicyRetrievalPointFixture>
    {
        private readonly HttpClient _client;
        private readonly PolicyRetrievalPointFixture _fixture;

        public DelegationsControllerTest(PolicyRetrievalPointFixture fixture)
        {
            _fixture = fixture;
            _client = _fixture.GetClient();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            string token = PrincipalUtil.GetAccessToken("sbl.authorization");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        /// <summary>
        /// Test case: Calling the "Hello world" GET endpoint on the DelegationsController
        /// Expected: returns 200 OK with content: "Hello world!"
        /// </summary>
        [Fact]
        public async Task Get_HelloWorld()
        {
            // Act
            HttpResponseMessage response = await _client.GetAsync($"authorization/api/v1/delegations");
            string responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("\"Hello world!\"", responseContent);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a valid deletion of org1/app3
        /// Expected: DeleteRules returns status code 201 and list of rules created match expected
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to perform a valid deletion
        /// Input:
        /// List of two one rule in one policy for deletion of the app org1/app3 between for a single offeredby/coveredby combination resulting in a single policyfile beeing updated.
        /// Expected Result:
        /// Rules are deleted and returned with the CreatedSuccessfully flag set and rule ids
        /// Success Criteria:
        /// DeleteRules returns status code 201 and list of rules deleted to match expected
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_Success()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App3_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app3", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a valid deletion of org1/app3 without a valid bearertoken
        /// Expected: DeleteRules returns status code 401
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to perform a valid deletion
        /// Input:
        /// List of two one rule in one policy for deletion of the app org1/app3 between for a single offeredby/coveredby combination resulting in a single policyfile beeing updated.
        /// Expected Result:
        /// Responce declined as it is not Authorized
        /// Success Criteria:
        /// DeleteRules returns status code 401
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_WithoutAuthorization()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App3_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "ThisIsNotAValidToken");
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a valid deletion of org1/app3 org1/app4 org1/app8
        /// Expected: DeleteRules returns status code 206 and list of rules created match expected
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to perform a valid deletion but one of the policy files was not found and some rules was therfore not deleted
        /// Input:
        /// List of four rules for deletion spread accross 3 policy files of the app org1/app3 org1/app4 and org1/app8 between for a single offeredby/coveredby combination resulting in two policyfile beeing updated.
        /// Expected Result:
        /// Rules are deleted and returned with the CreatedSuccessfully flag set and rule ids but not all rules is retuned
        /// Success Criteria:
        /// DeleteRules returns status code 206 and list of rules dleted to match expected
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_OnePolicyMissing_PartialSucess()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App3App4App8_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app4", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app4", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a deletion of org1/app4 and org1/app3 without rules defined
        /// Expected: DeleteRules returns status code 500 and no list of rules as one of the policies had no ruleids defined
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to delete rules without giving a RuleId
        /// Input:
        /// List of three rules for delegation of the app org1/app3 and org1/app4 between for a single offeredby/coveredby combination resulting in no policy file beeing updated.
        /// Expected Result:
        /// No Rules are deleted and no rules are returned
        /// Success Criteria:
        /// DeleteRules returns status code 500 and no deletion is performed
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_InvalidInput_BadRequest()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App3App4_50001337_20001337_NoRule.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            List<Rule> actual = null;
            try
            {
                actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));
            }
            catch
            {
                // do nothing this is expected
            }

            Assert.Null(actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a deletion of org1/app4 and org1/app3 without rules defined
        /// Expected: DeleteRules returns status code 500 and no list of rules as one of the policies had no ruleids defined
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to delete rules without giving a RuleId
        /// Input:
        /// List of three rules for delegation of the app org1/app3 and org1/app4 between for a single offeredby/coveredby combination resulting in no policy file beeing updated.
        /// Expected Result:
        /// No Rules are deleted and no rules are returned
        /// Success Criteria:
        /// DeleteRules returns status code 500 and no deletion is performed
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_ValidInputAllFails_BadRequest()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App8-Errorpostgrewritechangefail_50001337_20001337_NoUpdates.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            List<Rule> actual = null;
            try
            {
                actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));
            }
            catch
            {
                // do nothing this is expected
            }

            Assert.Null(actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeleteRules to perform a deletion of org1/app3 with difrent rules on same policy declared in two requests
        /// Expected: DeleteRules returns status code 500 and no list of rules as the same policy was tried to delete from twice
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeleteRules to delete rules giving the dame policy twice
        /// Input:
        /// List of two rules for deletion of the app org1/app3 for a single offeredby/coveredby combination resulting in no policy file beeing updated.
        /// Expected Result:
        /// No Rules are deleted and no rules are returned
        /// Success Criteria:
        /// DeleteRules returns status code 500 and no deletion is performed
        /// </summary>
        [Fact]
        public async Task Post_DeleteRules_DuplicatePolicy_BadRequest()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeleteRules/ReadOrg1App3_50001337_20001337_DuplicatePolicy.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeleteRules", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            ValidationProblemDetails actual = (ValidationProblemDetails)JsonConvert.DeserializeObject(responseContent, typeof(ValidationProblemDetails));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            string errorMessage = actual.Errors.Values.FirstOrDefault()[0];
            Assert.Equal("Input should not contain any duplicate policies", errorMessage);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a valid deletion of org1/app3 org1/app4
        /// Expected: DeletePolicy returns status code 201 and list of rules created match expected
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion
        /// Input:
        /// List of 2 policy files of the app org1/app3 and org1/app4 between for a single offeredby/coveredby combination resulting in all rules in two policyfile beeing removed.
        /// Expected Result:
        /// Rules are deleted and returned with the CreatedSuccessfully flag set and rule ids but not all rules is retuned
        /// Success Criteria:
        /// DeleteRules returns status code 201 and list of rules deleted to match expected
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_Sucess()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/ReadOrg1App3App4_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app4", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app4", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a valid deletion of org1/app3 with invalid Authorization token
        /// Expected: DeletePolicy returns status code 401
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion withot valid bearertoken
        /// Input:
        /// List of 2 policy files of the app org1/app3 and org1/app4 between for a single offeredby/coveredby combination resulting Http Unauthorized
        /// Expected Result:
        /// Nothing is performed and responce has UnAuthorized responcecode
        /// Success Criteria:
        /// DeleteRules returns status code 401
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_InvalidBearerToken_Unauthorized()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/ReadOrg1App3App4_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "ThisIsNotAValidToken");
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);
                        
            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);            
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a valid deletion of org1/app3 org1/app4 and one who does not exixt org1/app8
        /// Expected: DeletePolicy returns status code 206 and list of rules deleted match expected
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion
        /// Input:
        /// List of 3 policy files of the app org1/app3 and org1/app4 and org1/app8 between for a single offeredby/coveredby combination resulting in two policyfile beeing updated.
        /// Expected Result:
        /// Rules are deleted and returned with the CreatedSuccessfully flag set and rule in defoned policy files but not all policyfiles was touched so only rules from updated policyfiles is returned
        /// Success Criteria:
        /// DeletePolicy returns status code 206 and list of rules deleted to match expected
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_OneMissingPolicyFile_PartialSucess()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/ReadOrg1App3App4App8_50001337_20001337.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app4", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001337, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app4", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a valid deletion of org1/app8 error/postgrewritechangefail
        /// Expected: DeletePolicy returns status code 500
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion
        /// Input:
        /// List of four rules for deletion spread accross 2 policy files of the app org1/app8 and error/postgrewritechangefail between for a single offeredby/coveredby combination.
        /// Expected Result:
        /// Nothing are deleted and 500 status code is returned
        /// Success Criteria:
        /// postgrewritechangefail returns status code 500
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_AllPoliciesFail_Fail()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/ReadOrg1App8-Errorpostgrewritechangefail_50001337_20001337_NoUpdates.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            List<Rule> actual = null;
            try
            {
                actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));
            }
            catch
            {
                // Do nothing expected
            }

            // Assert
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            Assert.Null(actual);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a invalid deletion of org1/app3 with the same policy defined twice
        /// Expected: DeletePolicy returns status code 500
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion
        /// Input:
        /// List of four rules for deletion spread accross 2 policy files of the app org1/app8 and error/postgrewritechangefail between for a single offeredby/coveredby combination.
        /// Expected Result:
        /// Nothing are deleted and 500 status code is returned
        /// Success Criteria:
        /// returns status code 500
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_DuplicatePoliciesDefinedInput()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/ReadOrg1App3-DuplicatePolicyInRequest_50001337_20001337_NoUpdates.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            ValidationProblemDetails actual = (ValidationProblemDetails)JsonConvert.DeserializeObject(responseContent, typeof(ValidationProblemDetails));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            string errorMessage = actual.Errors.Values.FirstOrDefault()[0];
            Assert.Equal("Input should not contain any duplicate policies", errorMessage);
        }

        /// <summary>
        /// Test case: Calling the POST operation for DeletePolicy to perform a invalid deletion of org1/app3 with the same policy defined twice
        /// Expected: DeletePolicy returns status code 500
        /// </summary>
        /// <summary>
        /// Scenario:
        /// Calling the POST operation for DeletePolicy to perform a valid deletion
        /// Input:
        /// List of four rules for deletion spread accross 2 policy files of the app org1/app8 and error/postgrewritechangefail between for a single offeredby/coveredby combination.
        /// Expected Result:
        /// Nothing are deleted and 500 status code is returned
        /// Success Criteria:
        /// returns status code 500
        /// </summary>
        [Fact]
        public async Task Post_DeletePolicies_EmptyInput()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/DeletePolicies/EmptyInput.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/DeletePolicy", content);

            string responseContent = await response.Content.ReadAsStringAsync();

            ValidationProblemDetails actual = (ValidationProblemDetails)JsonConvert.DeserializeObject(responseContent, typeof(ValidationProblemDetails));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            string errorMessage = actual.Errors.Values.FirstOrDefault()[0];
            Assert.Equal("A non-empty request body is required.", errorMessage);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to without AccessToken
        /// Expected Result:
        /// Call should return Unauthorized
        /// Success Criteria:
        /// AddRules returns status code 401 Unauthorized
        /// </summary>
        [Fact]
        public async Task Post_AddRules_Unauthorized()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/ReadWriteOrg1App1_50001337_20001336.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "ThisIsNotAValidToken");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to without any rules specified in the body
        /// Expected Result:
        /// Call should return Badrequest
        /// Success Criteria:
        /// AddRules returns status code 400 Badrequest
        /// </summary>
        [Fact]
        public async Task Post_AddRules_Badrequest_NoRules()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/EmptyRuleModel.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to with invalid rule model
        /// Expected Result:
        /// Call should return Badrequest
        /// Success Criteria:
        /// AddRules returns status code 400 Badrequest
        /// </summary>
        [Fact]
        public async Task Post_AddRules_Badrequest_InvalidModel()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/InvalidRuleModel.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to perform a valid delegation
        /// Input:
        /// List of two rules for delegation of the app org1/app1 between for a single offeredby/coveredby combination resulting in a single delegation policy.
        /// Expected Result:
        /// Rules are created and returned with the CreatedSuccessfully flag set and rule ids
        /// Success Criteria:
        /// AddRules returns status code 201 and list of rules created match expected
        /// </summary>
        [Fact]
        public async Task Post_AddRules_Success()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/ReadWriteOrg1App1_50001337_20001336.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "org1", "app1", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to perform a valid delegation
        /// Input:
        /// List of 4 rules for delegation of from 4 different offeredBys to 4 different coveredBys for 4 different apps. Resulting in 4 different delegation policy files
        /// Expected Result:
        /// Rules are created and returned with the CreatedSuccessfully flag set and rule ids
        /// Success Criteria:
        /// AddRules returns status code 201 and list of rules created match expected
        /// </summary>
        [Fact]
        public async Task Post_AddRules_MultipleAppsOfferedBysAndCoveredBys_Success()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/MultipleAppsOfferedBysAndCoveredBys.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001337, 50001337, "50001336", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", "org1", "app2", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001336, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001336, "50001337", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", "org2", "app2", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.True(actual.TrueForAll(a => a.CreatedSuccessfully));
            Assert.True(actual.TrueForAll(a => !string.IsNullOrEmpty(a.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to perform a partially valid delegation
        /// Input:
        /// List of 4 rules for delegation of from 4 different offeredBys to 4 different coveredBys for 4 different apps. Resulting in 4 different delegation policy files. 1 of the rules are for an app which does not exist
        /// Expected Result:
        /// 3 Rules are created and returned with the CreatedSuccessfully flag set and rule ids
        /// 1 Rule is not created and returned with the CreatedSuccessfully flag set to false and no rule id
        /// Success Criteria:
        /// AddRules returns status code 206 and list of rules created match expected
        /// </summary>
        [Fact]
        public async Task Post_AddRules_OneInvalidApp_PartialSuccess()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/OneOutOfFourInvalidApp.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001337, 50001337, "50001336", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", "org1", "INVALIDAPPNAME", createdSuccessfully: false),
                TestDataHelper.GetRuleModel(20001336, 50001336, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001336, "50001337", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", "org2", "app2", createdSuccessfully: true),
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertionUtil.AssertEqual(expected[i], actual[i]);
            }
        }

        /// <summary>
        /// Scenario:
        /// Calling the POST operation for AddRules to perform a partially valid delegation
        /// Input:
        /// List of 4 rules for delegation of from 4 different offeredBys to 4 different coveredBys for 4 different apps. Resulting in 4 different delegation policy files. 1 of the rules are incomplete (missing org/app resource specification)
        /// Expected Result:
        /// 3 Rules are created and returned with the CreatedSuccessfully flag set and rule ids
        /// 1 Rule is not created and returned with the CreatedSuccessfully flag set to false and no rule id
        /// Success Criteria:
        /// AddRules returns status code 206 and list of rules created match expected
        /// </summary>
        [Fact]
        public async Task Post_AddRules_OneIncompleteInput_MissingOrgApp_PartialSuccess()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Json/AddRules/OneOutOfFourIncompleteApp.json");
            StreamContent content = new StreamContent(dataStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            Rule invalidRule = TestDataHelper.GetRuleModel(20001337, 50001337, "50001336", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", null, null, createdSuccessfully: false);
            invalidRule.Resource = new List<AttributeMatch>();
            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001336, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(20001336, 50001336, "50001337", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Write", "org2", "app2", createdSuccessfully: true),
                invalidRule,
            };

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/delegations/addrules", content);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<Rule> actual = (List<Rule>)JsonConvert.DeserializeObject(responseContent, typeof(List<Rule>));

            // Assert
            Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertionUtil.AssertEqual(expected[i], actual[i]);
            }
        }
    }
}
