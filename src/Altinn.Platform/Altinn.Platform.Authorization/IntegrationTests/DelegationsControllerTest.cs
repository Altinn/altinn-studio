using System.Collections.Generic;
using System.IO;
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
    }
}
