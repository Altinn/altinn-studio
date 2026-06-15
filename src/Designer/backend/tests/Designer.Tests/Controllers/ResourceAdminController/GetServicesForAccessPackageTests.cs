using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController;

public class GetServicesForAccessPackage
    : ResourceAdminControllerTestsBaseClass<GetServicesForAccessPackage>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public GetServicesForAccessPackage(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task GetServicesForAccessPackage_Ok()
    {
        // Arrange
        string uri = $"designer/api/accesspackageservices/urn:altinn:accesspackage:akvakultur/at22";
        using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri))
        {
            ResourceRegistryMock
                .Setup(r => r.GetSubjectResources(It.IsAny<List<string>>(), It.IsAny<string>()))
                .ReturnsAsync([]);
            ResourceRegistryMock
                .Setup(r =>
                    r.GetServiceResourceList(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>())
                )
                .ReturnsAsync([]);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
