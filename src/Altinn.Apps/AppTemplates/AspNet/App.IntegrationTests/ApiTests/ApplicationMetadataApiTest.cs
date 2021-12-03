using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Api.Models;
using Altinn.App.IntegrationTests;

using App.IntegrationTests.Utils;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ApplicationMetadataApiTest: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ApplicationMetadataApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Scenario: Get application metadata with correct org/id
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationMetadataSuccess()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/model-validation/api/v1/applicationmetadata";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("ttd/model-validation", responseContent);
        }

        /// <summary>
        /// Scenario: get applicationmmetadata with erronious org/app
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationMetadataFail()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/dummyApp/api/v1/applicationmetadata";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
          
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Contains("ttd/model-validation", responseContent);
        }

        /// <summary>
        /// Scenario: Get applicationmetadata with org/app check suppression
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationMetadataSuppressAppIdCheck()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/dummyOrg/dummyApp/api/v1/applicationmetadata?checkOrgApp=false";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("ttd/model-validation", responseContent);
        }

        /// <summary>
        /// Scenario:XACML Polic for app
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetXacmlPolicy()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/model-validation/api/v1/meta/authorizationpolicy";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("xacml:Policy", responseContent);
        }

        /// <summary>
        /// Scenario:XACML Polic for app
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetBPMNProcess()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/model-validation/api/v1/meta/process";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("bpmn:definitions", responseContent);
        }
    }
}
