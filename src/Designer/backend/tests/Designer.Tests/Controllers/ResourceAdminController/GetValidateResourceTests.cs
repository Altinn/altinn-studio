using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetValidateResourceTests : ResourceAdminControllerTestsBaseClass<GetValidateResourceTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetValidateResourceTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task ValidateServiceResourceById_IsValid()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/validate/ttd-resources/ttdresource";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>())).Returns(Task.FromResult(GetServiceResourceForValidationTest(true)));

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

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

            RepositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>())).Returns(Task.FromResult(GetServiceResourceForValidationTest(false)));

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
