using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class ImportResourceTests : ResourceAdminControllerTestsBaseClass<ImportResourceTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public ImportResourceTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task ExportAltinn2Resource()
        {
            // Arrange
            string uri = $"designer/api/ttd/resources/importresource/4485/4444/at23";
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri))
            {
                httpRequestMessage.Content = new StringContent("new-resource-id", Encoding.UTF8, MediaTypeNames.Application.Json);
                ServiceResource serviceResource = new ServiceResource()
                {
                    Identifier = "234",
                };

                XacmlPolicy policy = AuthorizationUtil.ParsePolicy("resource_registry_delegatableapi.xml");

                ResourceRegistryMock.Setup(r => r.GetServiceResourceFromService(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(serviceResource);
                ResourceRegistryMock.Setup(r => r.GetXacmlPolicy(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(policy);

                // Act
                using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            }
        }
    }
}
