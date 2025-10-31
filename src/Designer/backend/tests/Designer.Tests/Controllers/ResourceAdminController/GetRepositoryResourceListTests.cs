using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetRepositoryResourceListTests : ResourceAdminControllerTestsBaseClass<GetRepositoryResourceListTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetRepositoryResourceListTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetResourceList_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/ttd/resources/resourcelist";

            RepositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .Returns(Task.FromResult(new List<ListviewServiceResource>
                {
                    new ListviewServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        ResourceType = ResourceType.Default,
                    }
                }));

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceList_NoContent()
        {
            // Arrange
            string uri = $"{VersionPrefix}/orgwithoutrepo/resources/resourcelist";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            RepositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .Returns(Task.FromResult(new List<ListviewServiceResource>()));

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
