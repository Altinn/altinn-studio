using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class ImportResourceTests : ResourceAdminControllerTestsBaseClass<ImportResourceTests>
    {

        public ImportResourceTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task ExportAltinn2Resource()
        {
            // Arrange
            string uri = $"designer/api/ttd/resources/importresource/4485/4444/at23";
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri))
            {
                ServiceResource serviceResource = new ServiceResource()
                {
                    Identifier = "234",
                };

                XacmlPolicy policy = AuthorizationUtil.ParsePolicy("resource_registry_delegatableapi.xml");

                Altinn2MetadataClientMock.Setup(r => r.GetServiceResourceFromService(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(serviceResource);
                Altinn2MetadataClientMock.Setup(r => r.GetXacmlPolicy(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(policy);

                // Act
                using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

                // Assert
                Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            }
        }
    }
}
