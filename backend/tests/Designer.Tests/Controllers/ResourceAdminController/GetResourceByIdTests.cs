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
    public class GetResourceByIdTests : ResourceAdminControllerTestsBaseClass<GetResourceByIdTests>
    {

        public GetResourceByIdTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetResourceById_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/ttd/resources/ttd-resources/ttd_testresource";

            RepositoryMock
                .Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        IsPartOf = string.Empty,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        Delegable = true,
                        Visible = true,
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        ResourceType = ResourceType.Default,
                    });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_Passing_Repository_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/ttd/resources/ttd-app-resources";

            RepositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<ServiceResource>
                {
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        IsPartOf = string.Empty,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        Delegable = true,
                        Visible = true,
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        ResourceType = ResourceType.Default,
                    }
                });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_NoContent()
        {
            // Arrange
            string uri = $"{VersionPrefix}/orgwithoutrepo/resources/ttd-resources/ttd_test_resource";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_Passing_Repository_NoContent()
        {
            // Arrange
            string uri = $"{VersionPrefix}/orgwithoutrepo/resources/ttd-resources";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_PassingNoValidArgument_NoContent()
        {
            // Arrange
            string uri = $"{VersionPrefix}/orgwithoutrepo/resources/orgwithoutrepo-resources/notvalidresource";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }
    }
}
