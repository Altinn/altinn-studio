using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.IntegrationTests.Utils;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyControllerTest : IClassFixture<PolicyRetrivevalPointFixture>
    {
        private readonly HttpClient _client;
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PolicyRetrivevalPointFixture _fixture;
        public PolicyControllerTest(PolicyRetrivevalPointFixture fixture)
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
    }
}
