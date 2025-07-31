using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ConfigController
{
    public class SetServiceConfigTests : DesignerEndpointsTestsBase<SetServiceConfigTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/config";
        public SetServiceConfigTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task SetServiceConfig_OK(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string dataPathWithData = VersionPrefix(org, targetRepository);

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { serviceName = new LocalizedString()
            {
                Nb = "Alternative-form-name",
                En = "Alternative-form-name-en",
                Nn = "Alternative-form-name-nn"
            }, serviceDescription = "", serviceId = "" });

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            ServiceConfiguration serviceConfiguration = ServiceConfigurationUtils.GetServiceConfiguration(TestRepositoriesLocation, org, targetRepository, "testUser");

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal("Alternative-form-name", serviceConfiguration.ServiceName.Nb);
        }
    }
}
