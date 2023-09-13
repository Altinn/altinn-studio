using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetAltinn2LinkServicesTests : ResourceAdminControllerTestsBaseClass<GetAltinn2LinkServicesTests>
    {

        public GetAltinn2LinkServicesTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
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

                Altinn2MetadataClientMock.Setup(r => r.AvailableServices(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(services);

                // Act
                using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

                // Assert
                Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            }
        }
    }
}
