using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetValidateResourceTests : ResourceAdminControllerTestsBaseClass<GetValidateResourceTests>
    {

        public GetValidateResourceTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task ValidateServiceResourceById_IsValid()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/validate/ttd-resources/ttdresource";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourceForValidationTest(true));

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResourceById_IsInValid()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/validate/ttd-resources/ttdresource";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourceForValidationTest(false));

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResource_IsValid()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/validate/ttd-resources";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock.Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourcesForValidationTest(true));

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResource_IsInValid()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/validate/ttd-resources";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock.Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourcesForValidationTest(false));

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
