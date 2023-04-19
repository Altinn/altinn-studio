using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ConfigController
{
    public class GetServiceConfigTests : ConfigControllerTestsBase<GetServiceConfigTests>
    {

        public GetServiceConfigTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ConfigController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "apps-test")]
        public async Task GetServiceConfig_AppWithoutConfig_OK(string org, string app)
        {
            string dataPathWithData = VersionPrefix(org, app);
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            ServiceConfiguration serviceConfigResponse = await response.Content.ReadAsAsync<ServiceConfiguration>();
            ServiceConfiguration serviceConfiguration = new ServiceConfiguration { RepositoryName = app, ServiceDescription = null, ServiceId = null, ServiceName = null };

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(serviceConfiguration.RepositoryName, serviceConfigResponse.RepositoryName);
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem")]
        public async Task GetServiceConfig_AppWithConfig_OK(string org, string app)
        {
            string dataPathWithData = VersionPrefix(org, app);
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            ServiceConfiguration serviceConfigResponse = await response.Content.ReadAsAsync<ServiceConfiguration>();
            ServiceConfiguration serviceConfiguration = GetServiceConfiguration(org, app);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(serviceConfiguration.RepositoryName, serviceConfigResponse.RepositoryName);
            Assert.Equal(serviceConfiguration.ServiceDescription, serviceConfigResponse.ServiceDescription);
            Assert.Equal(serviceConfiguration.ServiceId, serviceConfigResponse.ServiceId);
            Assert.Equal(serviceConfiguration.ServiceName, serviceConfigResponse.ServiceName);
        }
    }
}
