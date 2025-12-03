using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetAltinn2LinkServicesTests : ResourceAdminControllerTestsBaseClass<GetAltinn2LinkServicesTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetAltinn2LinkServicesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetFilteredLinkServices()
        {
            // Arrange
            string uri = $"designer/api/brg/resources/altinn2linkservices/at23";
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri))
            {
                List<AvailableService> services = new List<AvailableService>();
                services.Add(new AvailableService()
                {
                    ServiceName = "Test",
                    ExternalServiceCode = "Test",
                    ExternalServiceEditionCode = 123
                });
                services.Add(new AvailableService()
                {
                    ServiceName = "Test 2",
                    ExternalServiceCode = "Test2",
                    ExternalServiceEditionCode = 123
                });
                ResourceRegistryMock.Setup(r => r.GetResourceList(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>())).ReturnsAsync(new List<ServiceResource>());
                Altinn2MetadataClientMock.Setup(r => r.AvailableServices(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(services);

                // Act
                using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            }
        }
    }
}
