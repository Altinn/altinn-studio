using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.App.Services.Configuration;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Models;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ApplicationSettingsApiTest: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ApplicationSettingsApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Scenario: Get application settings for app with a configured AppOidcProvider
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationSettings_WithOidcProvider()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/model-validation/api/v1/applicationsettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            SimpleAppSettings appsettings = JsonSerializer.Deserialize<SimpleAppSettings>(responseContent, options);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("idporten", appsettings.AppOidcProvider);
        }

        /// <summary>
        /// Scenario: Get application settings for app with a configured AppOidcProvider
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationSettings_WithOutOidcProvider()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "externalprefil");

            string requestUri = "/ttd/model-validation/api/v1/applicationsettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            SimpleAppSettings appsettings = JsonSerializer.Deserialize<SimpleAppSettings>(responseContent, options);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(appsettings.AppOidcProvider);
        }

        /// <summary>
        /// Scenario: Get application settings for app with a configured AppOidcProvider
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationSettings_WithHomeBasePath()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");

            string requestUri = "/ttd/model-validation/api/v1/applicationsettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
            };

            FrontEndSettings appsettings = JsonSerializer.Deserialize<FrontEndSettings>(responseContent, options);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("idporten", appsettings["appOidcProvider"]);
            Assert.Equal("https://www.testdirektoratet.no", appsettings["homeBasePath"]);
        }

        /// <summary>
        /// Scenario: Get application settings for app with a configured AppOidcProvider
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task GetApplicationSettings_WithNoFrontEndSettings()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "externalprefil");

            string requestUri = "/ttd/model-validation/api/v1/applicationsettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            FrontEndSettings appsettings = JsonSerializer.Deserialize<FrontEndSettings>(responseContent, options);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(appsettings);
        }
    }
}
