using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ConfigController
{
    public class SetServiceConfigTests : ConfigControllerTestsBase<SetServiceConfigTests>
    {

        public SetServiceConfigTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ConfigController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task SetServiceConfig_OK(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string dataPathWithData = VersionPrefix(org, targetRepository);
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { serviceName = "Alternative-form-name", serviceDescription = "", serviceId = "" });

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            ServiceConfiguration serviceConfiguration = GetServiceConfiguration(org, targetRepository);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal("Alternative-form-name", serviceConfiguration.ServiceName);
        }
    }
}
