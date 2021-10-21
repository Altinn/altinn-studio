using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
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
        /// Test case: Calling the POST operation for AddRules to perform a valid delegation of org1/app1
        /// Expected: AddRules returns status code 201 and list of rules created match expected
        /// </summary>
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

            string token = PrincipalUtil.GetAccessToken("sbl.authorization");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
        /// Test case: Calling the POST operation for AddRules to perform a valid delegation of multiple rules from 4 different offeredBys to 4 different coveredBys for 4 different apps. Resulting in 4 different delegation policy files
        /// Expected: AddRules returns status code 201 and list of rules created match expected
        /// </summary>
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

            string token = PrincipalUtil.GetAccessToken("sbl.authorization");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
        /// Test case: Calling the POST operation for AddRules to perform a partially valid delegation, as one of the four rules are for an invalid app
        /// Expected: AddRules returns status code 206 and list of resulting rules match expected
        /// </summary>
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

            string token = PrincipalUtil.GetAccessToken("sbl.authorization");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
        /// Test case: Calling the POST operation for AddRules to perform a partially valid delegation, as one of the four rules are incomplete (missing org/app resource specification)
        /// Expected: AddRules returns status code 206 and list of resulting rules match expected
        /// </summary>
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

            string token = PrincipalUtil.GetAccessToken("sbl.authorization");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
